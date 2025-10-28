import { test, expect } from '@playwright/test'
import * as fs from 'fs'

test.describe('Manual Export Verification', () => {
  test('complete workflow: upload → process → wait for ALL rows → export → verify', async ({ page }) => {
    console.log('\n🚀 Starting complete export verification workflow...\n')

    // Step 1: Navigate to bulk processor
    await page.goto('http://localhost:3334/bulk')
    console.log('✅ Step 1: Navigated to /bulk')

    // Step 2: Upload CSV
    const csvContent = `name,company
Alice Smith,TechCorp
Bob Jones,DataInc
Carol White,CloudCo`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-manual.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })

    console.log('✅ Step 2: CSV uploaded (3 rows)')
    await page.waitForTimeout(2000)

    // Step 3: Enter prompt
    const promptBox = page.locator('textarea').first()
    await promptBox.fill('Write a 1-sentence bio for {{name}} at {{company}}.')
    console.log('✅ Step 3: Prompt entered')

    // Step 4: Click Run button
    const runButton = page.locator('button').filter({ hasText: /run all/i }).first()
    await runButton.click()
    console.log('✅ Step 4: Batch started')
    console.log('⏳ Waiting for ALL rows to complete...\n')

    // Step 5: Wait for ALL 3 rows to show "Done" status
    const maxWaitTime = 180000 // 3 minutes
    const startTime = Date.now()
    let allRowsComplete = false

    while (!allRowsComplete && (Date.now() - startTime) < maxWaitTime) {
      // Count rows with "Done" status
      const doneRows = await page.locator('text=/^Done$/i').count()

      const elapsed = (Date.now() - startTime) / 1000
      console.log(`  ⏱️  ${elapsed.toFixed(0)}s elapsed - ${doneRows}/3 rows completed`)

      if (doneRows >= 3) {
        allRowsComplete = true
        console.log('\n✅ Step 5: ALL 3 rows completed!')
        break
      }

      await page.waitForTimeout(3000) // Check every 3 seconds
    }

    if (!allRowsComplete) {
      throw new Error('❌ Timeout: Not all rows completed within 3 minutes')
    }

    // Step 6: Wait extra time for database to fully update
    console.log('⏳ Waiting 5 seconds for database to fully update...')
    await page.waitForTimeout(5000)

    // Step 7: Click Export and download
    console.log('📥 Step 7: Clicking Export button...')

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
    await exportButton.click()

    const download = await downloadPromise
    const downloadPath = `/tmp/manual-export-${Date.now()}.csv`
    await download.saveAs(downloadPath)

    console.log(`✅ Step 8: File downloaded to ${downloadPath}`)

    // Step 9: Read and verify CSV content
    const csvData = fs.readFileSync(downloadPath, 'utf-8')
    console.log('\n📄 Downloaded CSV Content:')
    console.log('─'.repeat(80))
    console.log(csvData)
    console.log('─'.repeat(80))

    // Step 10: Verify CSV structure
    const lines = csvData.trim().split('\n')
    console.log(`\n📊 CSV Analysis:`)
    console.log(`  Total lines: ${lines.length}`)
    console.log(`  Expected: 4 (1 header + 3 data rows)`)

    expect(lines.length).toBeGreaterThanOrEqual(4)

    // Step 11: Verify output is NOT empty/pending
    let rowsWithActualOutput = 0
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      // Split by comma (rough parsing - good enough for verification)
      const hasContent = line.length > 50 // Bio should be at least 50 chars
      const notPending = !line.includes('pending')
      const notEmpty = !line.match(/,\s*,/) // No consecutive commas (empty field)

      if (hasContent && notPending && notEmpty) {
        rowsWithActualOutput++
        console.log(`  ✅ Row ${i}: Has actual content`)
      } else {
        console.log(`  ❌ Row ${i}: Empty or pending`)
      }
    }

    console.log(`\n📈 Results: ${rowsWithActualOutput}/${lines.length - 1} rows have actual AI output`)

    // Final verification
    expect(rowsWithActualOutput).toBeGreaterThanOrEqual(3)

    console.log('\n🎉 SUCCESS: Export function works correctly!')
    console.log('   ✓ Fetched from database')
    console.log('   ✓ Parsed output correctly')
    console.log('   ✓ Generated valid CSV')
    console.log('   ✓ Downloaded successfully\n')
  })
})
