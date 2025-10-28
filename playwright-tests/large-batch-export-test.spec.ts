import { test, expect } from '@playwright/test'
import * as fs from 'fs'

test.describe('Large Batch Export Test', () => {
  test('should handle 20-row batch export correctly', async ({ page }) => {
    console.log('\n🚀 Testing large batch export (20 rows)...\n')

    // Navigate to bulk processor
    await page.goto('http://localhost:3334/bulk')
    console.log('✅ Navigated to /bulk')

    // Create a 20-row CSV
    const companies = [
      'TechCorp', 'DataInc', 'CloudCo', 'AILabs', 'CodeBase',
      'DevOps Inc', 'SaaSCo', 'WebFlow', 'AppMakers', 'ByteCode',
      'PixelPerfect', 'LogicLeap', 'Innovatech', 'ScaleUp', 'GrowthHQ',
      'FastAPI', 'ServerSide', 'FrontEnd Ltd', 'BackendPro', 'FullStack'
    ]

    const names = [
      'Alice Smith', 'Bob Jones', 'Carol White', 'Dave Brown', 'Eve Davis',
      'Frank Miller', 'Grace Lee', 'Henry Wang', 'Iris Chen', 'Jack Taylor',
      'Kelly Martinez', 'Liam Anderson', 'Mia Thomas', 'Noah Jackson', 'Olivia Garcia',
      'Peter Rodriguez', 'Quinn Wilson', 'Ruby Martinez', 'Sam Lopez', 'Tina Hill'
    ]

    const csvRows = names.map((name, i) => `${name},${companies[i]}`).join('\n')
    const csvContent = `name,company\n${csvRows}`

    console.log(`📊 CSV: 20 rows with ${csvContent.length} characters`)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'large-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })

    console.log('✅ CSV uploaded (20 rows)')
    await page.waitForTimeout(2000)

    // Enter prompt
    const promptBox = page.locator('textarea').first()
    await promptBox.fill('Write a 1-sentence bio for {{name}} at {{company}}.')
    console.log('✅ Prompt entered')

    // Click Run button
    const runButton = page.locator('button').filter({ hasText: /run all/i }).first()
    await runButton.click()
    console.log('✅ Batch started (20 rows)')
    console.log('⏳ Waiting for ALL rows to complete (this may take 2-3 minutes)...\n')

    // Wait for ALL 20 rows to show "Done" status
    const maxWaitTime = 300000 // 5 minutes for 20 rows
    const startTime = Date.now()
    let allRowsComplete = false

    while (!allRowsComplete && (Date.now() - startTime) < maxWaitTime) {
      const doneRows = await page.locator('text=/^Done$/i').count()
      const elapsed = (Date.now() - startTime) / 1000

      if (elapsed % 10 < 3) { // Log every ~10 seconds
        console.log(`  ⏱️  ${elapsed.toFixed(0)}s elapsed - ${doneRows}/20 rows completed`)
      }

      if (doneRows >= 20) {
        allRowsComplete = true
        console.log(`\n✅ ALL 20 rows completed in ${elapsed.toFixed(1)}s!`)
        break
      }

      await page.waitForTimeout(3000)
    }

    if (!allRowsComplete) {
      throw new Error('❌ Timeout: Not all rows completed within 5 minutes')
    }

    // Wait for database to fully update
    console.log('⏳ Waiting 5 seconds for database to fully update...')
    await page.waitForTimeout(5000)

    // Click Export
    console.log('📥 Clicking Export button...')
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
    await exportButton.click()

    const download = await downloadPromise
    const downloadPath = `/tmp/large-batch-export-${Date.now()}.csv`
    await download.saveAs(downloadPath)

    console.log(`✅ File downloaded: ${downloadPath}`)

    // Read and analyze CSV
    const csvData = fs.readFileSync(downloadPath, 'utf-8')
    const lines = csvData.trim().split('\n')

    console.log('\n📊 CSV Analysis:')
    console.log(`  Total lines: ${lines.length}`)
    console.log(`  File size: ${(csvData.length / 1024).toFixed(2)} KB`)

    // Count rows with actual output
    let successfulRows = 0
    let emptyRows = 0
    let errorRows = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      if (line.includes('success') && line.length > 100) {
        successfulRows++
      } else if (line.includes('pending') || line.includes('""')) {
        emptyRows++
      } else if (line.includes('error') || line.includes('failed')) {
        errorRows++
      }
    }

    console.log(`\n📈 Results:`)
    console.log(`  ✅ Successful: ${successfulRows}`)
    console.log(`  ⏳ Empty/Pending: ${emptyRows}`)
    console.log(`  ❌ Errors: ${errorRows}`)

    // Show first 3 rows as sample
    console.log('\n📄 Sample Output (first 3 data rows):')
    console.log('─'.repeat(80))
    lines.slice(0, 4).forEach((line, i) => {
      const truncated = line.length > 100 ? line.substring(0, 100) + '...' : line
      console.log(`${i === 0 ? 'HEADER' : 'Row ' + i}: ${truncated}`)
    })
    console.log('─'.repeat(80))

    // Verify at least 18/20 rows succeeded (90% success rate)
    expect(successfulRows).toBeGreaterThanOrEqual(18)
    console.log(`\n🎉 SUCCESS: ${successfulRows}/20 rows exported correctly (${(successfulRows/20*100).toFixed(0)}% success rate)`)
  })
})
