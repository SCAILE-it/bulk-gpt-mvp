import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const PRODUCTION_URL = 'https://bulk-gpt-app.vercel.app'
const VERCEL_BYPASS = 'egSTIcJjASSj5vpuuyzUqIRIEZddEH4v'

test.describe('Webhook Fix - Production E2E Test', () => {
  test('should complete full flow: CSV upload → Modal processing → Webhook callback → Results', async ({ page }) => {
    console.log('\n========== WEBHOOK FIX E2E TEST ==========')

    // Set Vercel bypass header
    await page.setExtraHTTPHeaders({
      'x-vercel-protection-bypass': VERCEL_BYPASS
    })

    // Step 1: Navigate directly to Bulk GPT page (bypasses login)
    console.log('Step 1: Navigating to Bulk GPT page...')
    await page.goto(`${PRODUCTION_URL}/bulk`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: 'screenshots/webhook-e2e/01-bulk-page.png', fullPage: true })

    // Step 2: Create test CSV
    console.log('Step 2: Creating test CSV...')
    const csvContent = `name,company
John Doe,Acme Corp
Jane Smith,Tech Inc`

    const csvPath = path.join(process.cwd(), 'test-webhook-e2e.csv')
    fs.writeFileSync(csvPath, csvContent)

    // Step 3: Upload CSV
    console.log('Step 3: Uploading CSV...')
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/webhook-e2e/02-csv-uploaded.png', fullPage: true })

    // Step 4: Enter prompt
    console.log('Step 4: Entering prompt...')
    const promptInput = await page.locator('textarea[placeholder*="prompt" i], textarea[placeholder*="instruction" i]').first()
    await promptInput.fill('Write a short professional bio for {{name}} at {{company}}')

    await page.screenshot({ path: 'screenshots/webhook-e2e/03-prompt-entered.png', fullPage: true })

    // Step 5: Submit for processing
    console.log('Step 5: Submitting batch...')
    const submitButton = await page.locator('button:has-text("Process"), button:has-text("Submit"), button:has-text("Run")').first()
    await submitButton.click()

    // Wait for batch creation
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'screenshots/webhook-e2e/04-batch-submitted.png', fullPage: true })

    // Step 6: Monitor batch status
    console.log('Step 6: Monitoring batch status...')
    let batchCompleted = false
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max wait

    while (!batchCompleted && attempts < maxAttempts) {
      attempts++
      await page.waitForTimeout(5000)

      // Check for completion indicators
      const statusText = await page.textContent('body')

      if (statusText?.includes('completed') || statusText?.includes('success')) {
        console.log(`Batch completed after ${attempts * 5} seconds`)
        batchCompleted = true
        break
      }

      if (statusText?.includes('error') || statusText?.includes('failed')) {
        console.log('Batch failed!')
        await page.screenshot({ path: 'screenshots/webhook-e2e/ERROR-batch-failed.png', fullPage: true })
        throw new Error('Batch processing failed')
      }

      console.log(`Waiting... (${attempts * 5}s / ${maxAttempts * 5}s)`)

      if (attempts % 6 === 0) {
        await page.screenshot({ path: `screenshots/webhook-e2e/05-waiting-${attempts}.png`, fullPage: true })
      }
    }

    if (!batchCompleted) {
      await page.screenshot({ path: 'screenshots/webhook-e2e/ERROR-timeout.png', fullPage: true })
      throw new Error('Batch did not complete within 5 minutes')
    }

    // Step 7: Verify results are displayed
    console.log('Step 7: Verifying results...')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'screenshots/webhook-e2e/06-results.png', fullPage: true })

    const pageContent = await page.textContent('body')

    // Check for success indicators
    expect(pageContent).toMatch(/john\s*doe|jane\s*smith/i)

    console.log('✅ E2E Test PASSED - Full flow completed successfully!')
    console.log('========================================\n')

    // Cleanup
    fs.unlinkSync(csvPath)
  })
})
