/**
 * Debug test to investigate why BatchStatusCard shows "Pending" when rows are completed
 */

import { test, expect } from '@playwright/test'

const PROD_URL = 'https://bulk-gpt-app.vercel.app'

test('Debug BatchStatusCard pending issue on production', async ({ page }) => {
  test.setTimeout(300000) // 5 minutes

  console.log('\n🔍 Starting debug test for pending issue...\n')

  // Navigate to production
  await page.goto(`${PROD_URL}/bulk`)
  console.log('✓ Navigated to production bulk page')

  // Upload CSV
  const csvContent = `item
AWS
GCP
Impossible Cloud`

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'test-debug.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent),
  })
  console.log('✓ Uploaded CSV with 3 rows')

  // Wait for CSV to be loaded
  await page.waitForTimeout(2000)

  // Configure output columns (matching your test)
  const outputColumns = ['keyDifferentiators', 'marketPosition', 'overview', 'providerName']

  for (const col of outputColumns) {
    const fieldInput = page.locator('input[placeholder="field..."]')
    await fieldInput.fill(col)
    await fieldInput.press('Enter')
    await page.waitForTimeout(500)
  }
  console.log(`✓ Configured output columns: ${outputColumns.join(', ')}`)

  // Set prompt (similar to your test)
  const promptTextarea = page.locator('textarea').first()
  await promptTextarea.fill('Research {{item}} as a cloud provider. Return JSON with: keyDifferentiators (array), marketPosition (string), overview (string), providerName (string)')
  console.log('✓ Configured prompt')

  // Click Run All
  const runButton = page.locator('button:has-text("Run All")')
  await runButton.click()
  console.log('✓ Clicked Run All')

  // Wait for processing to start
  await page.waitForTimeout(3000)

  // Monitor the batch completion
  console.log('\n📊 Monitoring batch progress...\n')

  let attempt = 0
  const maxAttempts = 60 // 2 minutes

  while (attempt < maxAttempts) {
    attempt++

    // Check BatchStatusCard counts
    const successText = await page.locator('div:has-text("Success") p.text-lg').first().textContent()
    const failedText = await page.locator('div:has-text("Failed") p.text-lg').first().textContent()
    const pendingText = await page.locator('div:has-text("Pending") p.text-lg').first().textContent()

    const successCount = parseInt(successText || '0')
    const failedCount = parseInt(failedText || '0')
    const pendingCount = parseInt(pendingText || '0')

    // Check Results header
    const resultsHeader = await page.locator('span.text-xs.text-zinc-600').filter({ hasText: 'rows' }).textContent()

    // Count actual row statuses in table
    const doneRows = await page.locator('span:has-text("Done")').count()
    const failedRows = await page.locator('span.text-red-400:has-text("Failed")').count()
    const waitingRows = await page.locator('span:has-text("Waiting in queue")').count()
    const processingRows = await page.locator('span:has-text("Processing")').count()

    console.log(`[${attempt}/${maxAttempts}]`)
    console.log(`  BatchStatusCard: Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
    console.log(`  Results Header: ${resultsHeader}`)
    console.log(`  Table Rows: Done=${doneRows}, Failed=${failedRows}, Waiting=${waitingRows}, Processing=${processingRows}`)

    // Check if all rows are completed
    if (doneRows === 3 || failedRows + doneRows === 3) {
      console.log('\n✓ All rows completed!')

      // Take a screenshot
      await page.screenshot({ path: 'screenshots/production-fixes/debug-pending-issue.png', fullPage: true })
      console.log('✓ Screenshot saved to screenshots/production-fixes/debug-pending-issue.png')

      // Final verification
      console.log('\n📋 Final State:')
      console.log(`  BatchStatusCard - Success: ${successCount}, Failed: ${failedCount}, Pending: ${pendingCount}`)
      console.log(`  Table Rows - Done: ${doneRows}, Failed: ${failedRows}`)
      console.log(`  Results Header: ${resultsHeader}`)

      // The bug: pendingCount should be 0, not 3
      if (pendingCount === 3 && doneRows === 3) {
        console.log('\n❌ BUG CONFIRMED: BatchStatusCard shows Pending=3 when all rows are Done')
        console.log('   Expected: Success=3, Failed=0, Pending=0')
        console.log(`   Actual: Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
      } else if (pendingCount === 0 && successCount === 3) {
        console.log('\n✅ BUG FIXED: BatchStatusCard correctly shows Success=3, Pending=0')
      }

      break
    }

    await page.waitForTimeout(2000)
  }

  if (attempt === maxAttempts) {
    console.log('\n⏱️ Timeout reached, batch may still be processing')
  }
})
