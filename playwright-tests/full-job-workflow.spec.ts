import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * Full Bulk GPT Workflow E2E Test
 *
 * This test runs a complete batch processing job:
 * 1. Upload CSV file
 * 2. Configure prompt with variables
 * 3. Run batch processing
 * 4. Wait for completion
 * 5. Download results CSV
 * 6. Verify output contains AI-generated content (NOT batch creation response)
 *
 * Run with: npx playwright test playwright-tests/full-job-workflow.spec.ts --project=chromium
 */

test.describe('Full Bulk GPT Job Workflow', () => {
  test('should process a full job from upload to results download', async ({ page }) => {
    console.log('\n' + '='.repeat(80))
    console.log('🧪 FULL WORKFLOW E2E TEST - Bulk GPT')
    console.log('='.repeat(80) + '\n')

    // Navigate to bulk processor
    console.log('📍 Step 1: Navigate to /bulk page')
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')
    console.log('✅ Page loaded successfully\n')

    // Take initial screenshot
    await page.screenshot({
      path: 'test-results/workflow/01-initial-page.png',
      fullPage: true
    })

    // Upload CSV file
    console.log('📤 Step 2: Upload test CSV file')
    const testCsvPath = path.join(__dirname, '../test-data/companies-test.csv')

    // Verify test file exists
    if (!fs.existsSync(testCsvPath)) {
      throw new Error(`Test CSV file not found at ${testCsvPath}`)
    }

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testCsvPath)
    console.log(`✅ Uploaded: ${testCsvPath}`)

    // Wait for file processing
    await page.waitForTimeout(2000)

    // Verify file info appears (format: "3 rows • 2 cols")
    const fileInfo = page.locator('text=/\\d+ rows • \\d+ cols/')
    await expect(fileInfo).toBeVisible({ timeout: 5000 })
    const fileInfoText = await fileInfo.textContent()
    console.log(`✅ File processed: ${fileInfoText}\n`)

    await page.screenshot({
      path: 'test-results/workflow/02-file-uploaded.png',
      fullPage: true
    })

    // Configure prompt with variables
    console.log('✍️  Step 3: Configure prompt template')
    const promptTextarea = page.locator('textarea[placeholder*="prompt"]').or(
      page.locator('textarea').first()
    )

    const testPrompt = 'Write a one-sentence elevator pitch for {{company_name}}: {{description}}'
    await promptTextarea.fill(testPrompt)
    console.log(`✅ Prompt configured: "${testPrompt}"\n`)

    await page.screenshot({
      path: 'test-results/workflow/03-prompt-configured.png',
      fullPage: true
    })

    // Verify Run button is enabled
    console.log('🔍 Step 4: Verify Run button is enabled')
    const runButton = page.locator('button').filter({ hasText: /run|start|process/i })
    await expect(runButton).toBeVisible({ timeout: 5000 })
    await expect(runButton).toBeEnabled({ timeout: 5000 })
    console.log('✅ Run button is enabled\n')

    // Click Run button to start processing
    console.log('🚀 Step 5: Click Run button to start batch processing')
    await runButton.click()
    console.log('✅ Clicked Run button - batch processing starting...\n')

    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'test-results/workflow/04-processing-started.png',
      fullPage: true
    })

    // Wait for processing to complete
    console.log('⏳ Step 6: Wait for batch processing to complete')
    console.log('   (This may take 30-120 seconds depending on API response time)')

    // Look for completion indicators:
    // - "Download Results" button appears
    // - Status shows "completed" or "done"
    // - Progress shows 100% or "3/3 completed"

    const maxWaitTime = 180000 // 3 minutes max
    const startTime = Date.now()

    let processingComplete = false
    while (!processingComplete && (Date.now() - startTime) < maxWaitTime) {
      // Check for download button
      const downloadButton = page.locator('button').filter({ hasText: /download|export/i })
      const downloadVisible = await downloadButton.isVisible().catch(() => false)

      // Check for completion status
      const completedStatus = page.locator('text=/completed|done|finished|success/i')
      const statusVisible = await completedStatus.isVisible().catch(() => false)

      if (downloadVisible || statusVisible) {
        processingComplete = true
        console.log('✅ Processing completed!\n')
        break
      }

      // Log progress if visible
      const progressText = page.locator('text=/\\d+\\/\\d+|\\d+%/')
      const progressVisible = await progressText.isVisible().catch(() => false)
      if (progressVisible) {
        const progress = await progressText.textContent()
        console.log(`   Progress: ${progress}`)
      }

      // Wait before checking again
      await page.waitForTimeout(5000)
    }

    if (!processingComplete) {
      console.log('⚠️  WARNING: Processing did not complete within timeout')
      await page.screenshot({
        path: 'test-results/workflow/05-timeout-screenshot.png',
        fullPage: true
      })
      throw new Error('Batch processing did not complete within 3 minutes')
    }

    await page.screenshot({
      path: 'test-results/workflow/05-processing-complete.png',
      fullPage: true
    })

    // Download results CSV
    console.log('💾 Step 7: Download results CSV')

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

    // Click download button
    const downloadButton = page.locator('button').filter({ hasText: /download|export/i })
    await downloadButton.click()
    console.log('✅ Clicked Download button')

    // Wait for download to complete
    const download = await downloadPromise
    const downloadPath = path.join(__dirname, '../test-results/workflow/results.csv')
    await download.saveAs(downloadPath)
    console.log(`✅ Results saved to: ${downloadPath}\n`)

    // Verify CSV file was downloaded
    expect(fs.existsSync(downloadPath)).toBe(true)
    const fileSize = fs.statSync(downloadPath).size
    console.log(`📊 Results file size: ${fileSize} bytes`)

    // Read and parse the CSV results
    console.log('\n📋 Step 8: Verify CSV output')
    const csvContent = fs.readFileSync(downloadPath, 'utf-8')
    const lines = csvContent.trim().split('\n')

    console.log(`✅ CSV has ${lines.length} lines (including header)`)
    console.log('\n--- CSV CONTENT ---')
    console.log(csvContent)
    console.log('--- END CSV CONTENT ---\n')

    // Verify structure
    expect(lines.length).toBeGreaterThan(1) // At least header + 1 data row

    // Verify header contains expected columns
    const header = lines[0]
    expect(header).toContain('company_name')
    expect(header).toContain('description')
    console.log(`✅ Header contains expected columns: ${header}`)

    // Critical verification: Output should NOT be batch creation response
    console.log('\n🔍 Step 9: Verify output is AI-generated content (not batch metadata)')

    const dataLines = lines.slice(1) // Skip header
    let validOutputs = 0
    let invalidOutputs = 0

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]

      // Check if line contains batch creation response patterns
      const isBatchResponse = line.includes('batchId') ||
                             line.includes('"success":true') ||
                             line.includes('"status":"pending"') ||
                             line.includes('"results":')

      if (isBatchResponse) {
        invalidOutputs++
        console.log(`❌ Row ${i+1}: Contains batch creation response (NOT AI output)`)
        console.log(`   Content: ${line.substring(0, 100)}...`)
      } else {
        validOutputs++
        console.log(`✅ Row ${i+1}: Contains actual output`)
        // Show first 100 chars of output
        const outputStart = line.substring(line.indexOf(',') + 1, line.indexOf(',') + 100)
        console.log(`   Preview: ${outputStart}...`)
      }
    }

    // Final verification
    console.log('\n' + '='.repeat(80))
    console.log('📊 FINAL RESULTS')
    console.log('='.repeat(80))
    console.log(`Total rows processed: ${dataLines.length}`)
    console.log(`Valid AI outputs: ${validOutputs}`)
    console.log(`Invalid outputs (batch metadata): ${invalidOutputs}`)

    if (invalidOutputs > 0) {
      console.log('\n❌ FAILED: Output contains batch creation response instead of AI-generated content')
      console.log('   This indicates Bug #2 from the user report is still present.')
      throw new Error('Output shows batch metadata instead of actual AI results')
    }

    console.log('\n✅ SUCCESS: All outputs contain actual AI-generated content!')
    console.log('='.repeat(80) + '\n')

    // Final screenshot
    await page.screenshot({
      path: 'test-results/workflow/06-test-complete.png',
      fullPage: true
    })
  })
})
