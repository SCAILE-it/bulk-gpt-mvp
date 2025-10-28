import { test, expect } from '@playwright/test'
import * as fs from 'fs'

test.describe('Export Fix Verification', () => {
  test('should download completed results from database', async ({ page }) => {
    // Navigate to bulk processor
    await page.goto('http://localhost:3334/bulk')

    console.log('✅ Page loaded')

    // Upload CSV
    const csvContent = `company_name,description
Stripe,Online payment processing for internet businesses
Airbnb,Online marketplace for short-term homestays and experiences
Notion,Collaborative workspace combining notes and documents`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })

    console.log('✅ CSV uploaded')

    // Wait for file to process
    await page.waitForTimeout(2000)

    // Enter prompt
    const promptBox = page.locator('textarea').first()
    await promptBox.fill('Write a brief bio for {{company_name}}. {{description}}')

    console.log('✅ Prompt entered')

    // Click Run button
    const runButton = page.locator('button').filter({ hasText: /run all|run/i }).first()
    await runButton.click()

    console.log('✅ Batch started, waiting for completion...')

    // Wait for batch to complete (up to 3 minutes)
    const maxWaitTime = 180000
    const startTime = Date.now()
    let batchComplete = false

    while (!batchComplete && (Date.now() - startTime) < maxWaitTime) {
      // Check if Export button appears
      const exportButton = await page.locator('button').filter({ hasText: /export|download/i }).first().isVisible().catch(() => false)

      // Check if we see "Processing complete" or similar message
      const completeMessage = await page.locator('text=/complete|finished|done/i').first().isVisible().catch(() => false)

      if (exportButton || completeMessage) {
        batchComplete = true
        console.log('✅ Batch processing completed!')
        break
      }

      const elapsed = (Date.now() - startTime) / 1000
      console.log(`⏳ Still processing... (${elapsed.toFixed(0)}s elapsed)`)
      await page.waitForTimeout(5000)
    }

    if (!batchComplete) {
      throw new Error('Batch did not complete within 3 minutes')
    }

    // Wait a bit more to ensure database is fully updated
    await page.waitForTimeout(3000)

    // Click Export button
    console.log('📥 Clicking Export button...')

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    const exportBtn = page.locator('button').filter({ hasText: /export|download/i }).first()
    await exportBtn.click()

    // Wait for download
    const download = await downloadPromise
    const downloadPath = `/tmp/${download.suggestedFilename()}`
    await download.saveAs(downloadPath)

    console.log(`✅ File downloaded: ${downloadPath}`)

    // Read and verify CSV content
    const csvData = fs.readFileSync(downloadPath, 'utf-8')
    console.log('\n📄 Downloaded CSV content:')
    console.log(csvData)
    console.log('')

    // Verify CSV has actual content (not empty fields)
    const lines = csvData.trim().split('\n')
    expect(lines.length).toBeGreaterThan(1) // Header + at least 1 data row

    // Check that bio field is NOT empty in at least one row
    let hasNonEmptyBio = false
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      // Check if bio field (third column) is not empty
      const columns = line.split(',')
      if (columns.length >= 3) {
        const bioField = columns[2].replace(/"/g, '').trim()
        if (bioField && bioField !== '' && bioField !== 'pending') {
          hasNonEmptyBio = true
          console.log(`✅ Row ${i}: Bio field has content: ${bioField.substring(0, 50)}...`)
        }
      }
    }

    expect(hasNonEmptyBio).toBe(true)
    console.log('\n✅ SUCCESS: Export contains actual AI-generated output from database!')
  })
})
