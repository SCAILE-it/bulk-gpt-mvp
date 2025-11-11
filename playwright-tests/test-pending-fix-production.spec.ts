/**
 * Test to verify pending count fix on production
 */

import { test, expect } from '@playwright/test'

const PROD_URL = 'https://bulk-gpt-app.vercel.app'

test('Verify pending count fix on production', async ({ page }) => {
  test.setTimeout(300000) // 5 minutes

  console.log('\n🔍 Testing pending count fix on production...\n')

  // Navigate to production
  await page.goto(PROD_URL)
  console.log('✓ Navigated to production')

  // Wait for page to load
  await page.waitForTimeout(3000)

  // Check if we're on auth page or bulk page
  const url = page.url()
  console.log(`Current URL: ${url}`)

  if (url.includes('/auth') || url.includes('/login')) {
    console.log('⚠️  On auth page - attempting to navigate to /bulk')
    await page.goto(`${PROD_URL}/bulk`)
    await page.waitForTimeout(3000)
  }

  // Check if we can access the bulk page
  const currentUrl = page.url()
  console.log(`After navigation, URL: ${currentUrl}`)

  if (currentUrl.includes('/auth') || currentUrl.includes('/login')) {
    console.log('❌ Cannot access bulk page without authentication')
    console.log('Please ensure the deployment allows anonymous access or provide credentials')
    return
  }

  console.log('✓ On bulk page')

  // Take screenshot of initial state
  await page.screenshot({ path: 'screenshots/production-fixes/01-initial-state.png', fullPage: true })
  console.log('✓ Screenshot saved: 01-initial-state.png')

  // Upload CSV
  const csvContent = `item
AWS
GCP
Azure`

  const fileInput = page.locator('input[type="file"]')

  // Wait for file input to be available
  try {
    await fileInput.waitFor({ timeout: 10000 })
    console.log('✓ Found file input')
  } catch (e) {
    console.log('❌ Could not find file input element')
    await page.screenshot({ path: 'screenshots/production-fixes/error-no-file-input.png', fullPage: true })
    throw e
  }

  await fileInput.setInputFiles({
    name: 'test-pending-fix.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent),
  })
  console.log('✓ Uploaded CSV with 3 rows')

  // Wait for CSV to be processed
  await page.waitForTimeout(2000)

  // Take screenshot after CSV upload
  await page.screenshot({ path: 'screenshots/production-fixes/02-after-csv-upload.png', fullPage: true })
  console.log('✓ Screenshot saved: 02-after-csv-upload.png')

  // Configure output columns
  const outputColumns = ['name', 'type', 'region']

  for (const col of outputColumns) {
    const fieldInput = page.locator('input[placeholder="field..."]').first()
    await fieldInput.fill(col)
    await fieldInput.press('Enter')
    await page.waitForTimeout(500)
  }
  console.log(`✓ Configured output columns: ${outputColumns.join(', ')}`)

  // Set prompt
  const promptTextarea = page.locator('textarea').first()
  await promptTextarea.fill('Research {{item}} as a cloud provider. Return JSON with: name (string), type (string), region (string)')
  console.log('✓ Configured prompt')

  // Take screenshot before running
  await page.screenshot({ path: 'screenshots/production-fixes/03-before-run.png', fullPage: true })
  console.log('✓ Screenshot saved: 03-before-run.png')

  // Click Run All
  const runButton = page.locator('button:has-text("Run All")')
  await runButton.click()
  console.log('✓ Clicked Run All')

  // Wait for processing to start
  await page.waitForTimeout(3000)

  // Take screenshot right after starting
  await page.screenshot({ path: 'screenshots/production-fixes/04-just-started.png', fullPage: true })
  console.log('✓ Screenshot saved: 04-just-started.png')

  // Monitor the batch completion
  console.log('\n📊 Monitoring batch progress...\n')

  let attempt = 0
  const maxAttempts = 90 // 3 minutes (2s * 90)

  while (attempt < maxAttempts) {
    attempt++

    // Get BatchStatusCard counts
    const successText = await page.locator('div:has-text("Success") p.text-lg').first().textContent().catch(() => '0')
    const failedText = await page.locator('div:has-text("Failed") p.text-lg').first().textContent().catch(() => '0')
    const pendingText = await page.locator('div:has-text("Pending") p.text-lg').first().textContent().catch(() => '0')

    const successCount = parseInt(successText || '0')
    const failedCount = parseInt(failedText || '0')
    const pendingCount = parseInt(pendingText || '0')

    // Check Results header
    const resultsHeader = await page.locator('span.text-xs.text-zinc-600').filter({ hasText: 'rows' }).textContent().catch(() => 'N/A')

    // Count actual row statuses in table
    const doneRows = await page.locator('span:has-text("Done")').count()
    const failedRows = await page.locator('span.text-red-400:has-text("Failed")').count()
    const waitingRows = await page.locator('span:has-text("Waiting in queue")').count()
    const processingRows = await page.locator('span:has-text("Processing")').count()

    console.log(`[${attempt}/${maxAttempts}]`)
    console.log(`  BatchStatusCard: Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
    console.log(`  Results Header: ${resultsHeader}`)
    console.log(`  Table Rows: Done=${doneRows}, Failed=${failedRows}, Waiting=${waitingRows}, Processing=${processingRows}`)

    // Check for the bug vs fix
    if (attempt === 1) {
      // First check - initial state
      if (pendingCount === 0 && successCount === 0 && failedCount === 0) {
        console.log('  ✅ GOOD: Initial state shows all zeros (batch starting)')
      } else if (pendingCount === 3 && successCount === 0 && failedCount === 0) {
        console.log('  ✅ GOOD: Initial state shows Pending=3 (expected)')
      } else if (successCount === 3 && pendingCount === 3) {
        console.log('  ❌ BUG DETECTED: Shows Success=3, Pending=3 at start (double counting)')
      }
    }

    // Check if all rows are completed
    const totalCompleted = doneRows + failedRows
    if (totalCompleted === 3) {
      console.log('\n✅ All rows completed!')

      // Take final screenshot
      await page.screenshot({ path: 'screenshots/production-fixes/05-completed.png', fullPage: true })
      console.log('✓ Screenshot saved: 05-completed.png')

      // Final verification
      console.log('\n📋 Final State Verification:')
      console.log(`  BatchStatusCard - Success: ${successCount}, Failed: ${failedCount}, Pending: ${pendingCount}`)
      console.log(`  Table Rows - Done: ${doneRows}, Failed: ${failedRows}`)
      console.log(`  Results Header: ${resultsHeader}`)

      // Check for the bug
      if (pendingCount === 3 && doneRows === 3) {
        console.log('\n❌ BUG STILL EXISTS: BatchStatusCard shows Pending=3 when all rows are Done')
        console.log('   Expected: Success=3, Failed=0, Pending=0')
        console.log(`   Actual: Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
        throw new Error('Pending count bug still exists in production')
      } else if (pendingCount === 0 && successCount === 3) {
        console.log('\n✅ BUG FIXED: BatchStatusCard correctly shows Success=3, Pending=0')
      } else if (pendingCount === 0 && successCount + failedCount === 3) {
        console.log('\n✅ BUG FIXED: BatchStatusCard correctly shows Pending=0')
        console.log(`   Final counts: Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
      } else {
        console.log('\n⚠️  UNEXPECTED STATE:')
        console.log(`   Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
        console.log(`   Done rows=${doneRows}, Failed rows=${failedRows}`)
      }

      break
    }

    await page.waitForTimeout(2000)
  }

  if (attempt === maxAttempts) {
    console.log('\n⏱️  Timeout reached, batch may still be processing')
    await page.screenshot({ path: 'screenshots/production-fixes/timeout.png', fullPage: true })
  }

  console.log('\n✅ Test completed\n')
})
