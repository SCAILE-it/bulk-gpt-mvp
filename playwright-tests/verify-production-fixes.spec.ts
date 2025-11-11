import { test, expect } from '@playwright/test'

/**
 * E2E Test: Verify Production Fixes
 *
 * Tests both fixes deployed to production:
 * 1. Issue #2: JSON output parsing into separate columns
 * 2. Issue #1: BatchStatusCard progress counts update correctly
 */

// Test locally since production has Vercel auth enabled
const TEST_URL = 'http://localhost:3334'

test('Verify JSON parsing and BatchStatusCard fixes', async ({ page }) => {
  test.setTimeout(180000) // 3 minutes for batch processing
  console.log('\n🎬 Starting verification test...\n')

  // Navigate to /bulk page
  console.log('1️⃣  Navigating to /bulk page...')
  await page.goto(`${TEST_URL}/bulk`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'screenshots/production-fixes/01-bulk-page.png', fullPage: true })
  console.log('✅ Page loaded')

  // Upload CSV with test data
  console.log('\n2️⃣  Uploading test CSV...')
  const csvContent = `name,company,role
Alice Johnson,Stripe,Product Manager
Bob Smith,Anthropic,Research Scientist
Carol White,OpenAI,ML Engineer`

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'test-production.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent),
  })

  await expect(page.locator('[data-testid="row-count-display"]')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('[data-testid="row-count-display"]').first()).toContainText('3 rows')
  console.log('✅ CSV uploaded successfully')
  await page.screenshot({ path: 'screenshots/production-fixes/02-csv-uploaded.png', fullPage: true })

  // Configure output columns for structured JSON output
  console.log('\n3️⃣  Configuring output columns...')

  // Clear default "bio" field
  const bioField = page.locator('div:has-text("bio") button[aria-label*="Remove"]').first()
  if (await bioField.isVisible()) {
    await bioField.click()
    // Confirm deletion in the dialog
    await page.locator('button:has-text("Delete Field")').click()
    await page.waitForTimeout(500) // Wait for dialog to close
  }

  // Add multiple output fields
  const outputFields = ['company_name', 'industry', 'business_model']
  for (const field of outputFields) {
    const fieldInput = page.locator('input[placeholder="field..."]')
    await fieldInput.fill(field)
    await fieldInput.press('Enter')
    console.log(`   Added output field: ${field}`)
  }

  console.log('✅ Output columns configured')
  await page.screenshot({ path: 'screenshots/production-fixes/03-output-columns.png', fullPage: true })

  // Configure prompt for structured output
  console.log('\n4️⃣  Configuring prompt...')
  const promptTextarea = page.locator('textarea').first()
  await promptTextarea.fill('Analyze {{name}} at {{company}}. Return JSON with: company_name (string), industry (string), business_model (string describing their business in 1-2 sentences)')
  console.log('✅ Prompt configured')

  // Submit job
  console.log('\n5️⃣  Submitting batch job...')
  const runButton = page.locator('button:has-text("Run All")')
  await expect(runButton).toBeEnabled({ timeout: 5000 })
  await runButton.click()
  await page.screenshot({ path: 'screenshots/production-fixes/04-job-submitted.png', fullPage: true })

  // Wait for results table to appear
  await page.waitForTimeout(2000)

  // TEST #1: Verify BatchStatusCard appears and shows initial state
  console.log('\n6️⃣  Testing Issue #1: BatchStatusCard progress counts...')

  const batchStatusCard = page.locator('text=Success').first()
  await expect(batchStatusCard).toBeVisible({ timeout: 10000 })
  console.log('✅ BatchStatusCard is visible')

  // Capture initial state
  const initialSuccessText = await page.locator('div:has-text("Success") p.text-lg').first().textContent()
  const initialFailedText = await page.locator('div:has-text("Failed") p.text-lg').first().textContent()
  const initialPendingText = await page.locator('div:has-text("Pending") p.text-lg').first().textContent()

  console.log(`   Initial counts - Success: ${initialSuccessText}, Failed: ${initialFailedText}, Pending: ${initialPendingText}`)
  await page.screenshot({ path: 'screenshots/production-fixes/05-batch-status-initial.png', fullPage: true })

  // Poll for completion (max 120 seconds)
  console.log('\n7️⃣  Polling for completion...')
  const maxAttempts = 12
  const pollInterval = 10000
  let attempt = 0
  let completed = false

  while (attempt < maxAttempts && !completed) {
    attempt++
    console.log(`   Attempt ${attempt}/${maxAttempts} - Checking status...`)

    // Count completed rows
    const completedRows = await page.locator('tbody tr').filter({ hasText: 'Done' }).count()
    const failedRows = await page.locator('tbody tr').filter({ hasText: 'Failed' }).count()
    const totalProcessed = completedRows + failedRows

    console.log(`   Rows: ${completedRows} completed, ${failedRows} failed, ${totalProcessed}/3 total`)

    // Check BatchStatusCard counts
    const currentSuccessText = await page.locator('div:has-text("Success") p.text-lg').first().textContent()
    const currentFailedText = await page.locator('div:has-text("Failed") p.text-lg').first().textContent()
    const currentPendingText = await page.locator('div:has-text("Pending") p.text-lg').first().textContent()

    console.log(`   BatchStatusCard - Success: ${currentSuccessText}, Failed: ${currentFailedText}, Pending: ${currentPendingText}`)

    if (totalProcessed >= 3) {
      completed = true
      console.log('✅ All rows processed!')
      break
    }

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval)
    }
  }

  if (!completed) {
    await page.screenshot({ path: 'screenshots/production-fixes/ERROR-timeout.png', fullPage: true })
    throw new Error('Job did not complete within 120 seconds')
  }

  await page.screenshot({ path: 'screenshots/production-fixes/06-job-completed.png', fullPage: true })

  // TEST #1 VERIFICATION: BatchStatusCard counts should update
  console.log('\n8️⃣  Verifying Issue #1 fix (BatchStatusCard counts)...')

  const finalSuccessCount = parseInt(await page.locator('div:has-text("Success") p.text-lg').first().textContent() || '0')
  const finalFailedCount = parseInt(await page.locator('div:has-text("Failed") p.text-lg').first().textContent() || '0')
  const finalPendingCount = parseInt(await page.locator('div:has-text("Pending") p.text-lg').first().textContent() || '0')

  console.log(`   Final counts - Success: ${finalSuccessCount}, Failed: ${finalFailedCount}, Pending: ${finalPendingCount}`)

  // Verify counts are accurate
  const completedRowsCount = await page.locator('tbody tr').filter({ hasText: 'Done' }).count()
  const failedRowsCount = await page.locator('tbody tr').filter({ hasText: 'Failed' }).count()

  expect(finalSuccessCount).toBe(completedRowsCount)
  expect(finalFailedCount).toBe(failedRowsCount)
  expect(finalPendingCount).toBe(0) // Should be 0 when all done

  console.log('✅ Issue #1 VERIFIED: BatchStatusCard counts are accurate!')

  // TEST #2 VERIFICATION: JSON output should be in separate columns
  console.log('\n9️⃣  Verifying Issue #2 fix (JSON parsing into columns)...')

  // Check table headers for output columns
  const tableHeaders = page.locator('thead th')
  const headerTexts = await tableHeaders.allTextContents()

  console.log(`   Table headers: ${headerTexts.join(', ')}`)

  // Verify each output field has its own column
  for (const field of outputFields) {
    const headerExists = headerTexts.some(h => h.toLowerCase().includes(field.toLowerCase()))
    expect(headerExists).toBe(true)
    console.log(`   ✓ Found column header: ${field}`)
  }

  // Check first completed row to verify data is parsed into separate cells
  const firstCompletedRow = page.locator('tbody tr').filter({ hasText: 'Done' }).first()
  await expect(firstCompletedRow).toBeVisible()

  // Take screenshot of results table
  await page.screenshot({ path: 'screenshots/production-fixes/07-parsed-columns.png', fullPage: true })

  // Verify each cell has content (not one big JSON blob)
  const cells = firstCompletedRow.locator('td')
  const cellCount = await cells.count()

  console.log(`   First row has ${cellCount} cells`)
  expect(cellCount).toBeGreaterThan(5) // Status + 3 input cols + 3 output cols = 7+

  // Get text from output column cells
  const outputCellTexts = []
  for (let i = 0; i < Math.min(cellCount, 10); i++) {
    const cellText = await cells.nth(i).textContent()
    if (cellText && cellText.trim() !== '—') {
      outputCellTexts.push(cellText.trim())
    }
  }

  console.log(`   Sample cell contents: ${outputCellTexts.slice(0, 5).join(' | ')}`)

  // Verify content is NOT a single JSON blob (should not start with '{')
  const hasJsonBlob = outputCellTexts.some(text => text.startsWith('{') && text.includes('"company_name"'))
  expect(hasJsonBlob).toBe(false)

  console.log('✅ Issue #2 VERIFIED: JSON output is parsed into separate columns!')

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ PRODUCTION VERIFICATION COMPLETE')
  console.log('='.repeat(60))
  console.log('Issue #1 (BatchStatusCard): ✅ FIXED')
  console.log('Issue #2 (JSON Parsing): ✅ FIXED')
  console.log(`Success: ${finalSuccessCount}, Failed: ${finalFailedCount}, Pending: ${finalPendingCount}`)
  console.log('='.repeat(60) + '\n')
})
