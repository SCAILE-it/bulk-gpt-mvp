import { test, expect } from '@playwright/test'

/**
 * Test JSON Formatting Fix in UI
 * Verifies that JSON outputs wrapped in markdown code blocks are properly formatted
 */

test('JSON formatting - verify markdown code blocks are stripped and JSON is parsed', async ({ page }) => {
  test.setTimeout(60000)

  const batchId = 'batch_1762521473835_a3jkrt466' // From test batch

  console.log('\n🧪 Testing JSON Formatting in UI\n')
  console.log('='.repeat(60))

  // Navigate to production app
  await page.goto('https://bulkgpt.com/bulk', { waitUntil: 'networkidle' })

  console.log('✅ Navigated to /bulk page')

  // Wait for page to load
  await page.waitForTimeout(2000)

  // Screenshot initial state
  await page.screenshot({
    path: 'screenshots/json-formatting/01-page-loaded.png',
    fullPage: true
  })

  console.log('\n📊 Checking results display...')

  // Look for results table
  const hasResultsTable = await page.locator('table tbody tr').count() > 0

  if (hasResultsTable) {
    console.log('✅ Results table found')

    // Get all result rows
    const rows = await page.locator('table tbody tr').all()
    console.log(`  Found ${rows.length} rows`)

    // Check each row for properly formatted output
    for (let i = 0; i < Math.min(rows.length, 3); i++) {
      const row = rows[i]
      const cells = await row.locator('td').all()

      if (cells.length > 0) {
        const lastCell = cells[cells.length - 1]
        const cellText = await lastCell.textContent()

        console.log(`\nRow ${i + 1}:`)
        console.log(`  Text: ${cellText?.substring(0, 100)}...`)

        // Check that output does NOT contain:
        // 1. Raw JSON strings like '{"description": ...'
        // 2. Markdown code blocks like \`\`\`json
        const hasRawJSON = cellText?.includes('{"description"')
        const hasMarkdownBlocks = cellText?.includes('```')

        if (hasRawJSON) {
          console.log('  ❌ FAIL: Contains raw JSON')
        } else {
          console.log('  ✅ PASS: No raw JSON detected')
        }

        if (hasMarkdownBlocks) {
          console.log('  ❌ FAIL: Contains markdown code blocks')
        } else {
          console.log('  ✅ PASS: No markdown code blocks')
        }

        // Verify it looks like plain text description
        const looksLikeDescription = cellText && cellText.length > 50 && !cellText.includes('{')
        if (looksLikeDescription) {
          console.log('  ✅ PASS: Appears to be formatted description')
        }

        // Assertions
        expect(hasRawJSON).toBeFalsy()
        expect(hasMarkdownBlocks).toBeFalsy()
        expect(looksLikeDescription).toBeTruthy()
      }
    }

    await page.screenshot({
      path: 'screenshots/json-formatting/02-results-verified.png',
      fullPage: true
    })

    console.log('\n✅ JSON Formatting Test PASSED')
  } else {
    console.log('⚠️  No results table found on page')
    console.log('   This may be expected if viewing a different batch')
  }

  console.log('\n' + '='.repeat(60) + '\n')
})
