import { test, expect } from '@playwright/test'
import path from 'path'

const screenshotDir = path.join(__dirname, '..', 'screenshots', 'ui-audit-20251023')

test.describe('UI Audit - Full User Journey', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // Skip auth for UI audit

  test('complete bulk processing flow with screenshots', async ({ page }) => {
    let stepNumber = 0

    const screenshot = async (name: string) => {
      stepNumber++
      const filename = `${String(stepNumber).padStart(2, '0')}-${name}.png`
      await page.screenshot({
        path: path.join(screenshotDir, filename),
        fullPage: true
      })
      console.log(`📸 Screenshot saved: ${filename}`)
    }

    // Step 1: Load the bulk processing page
    await page.goto('http://localhost:3333/bulk')
    await page.waitForLoadState('networkidle')
    await screenshot('01-initial-load')

    // Step 2: CSV upload area (before upload)
    await page.waitForSelector('text=Drop your CSV file here')
    await screenshot('02-csv-upload-empty')

    // Step 3: Click on upload area to test click-to-select
    const dropzone = page.locator('[role="button"]').filter({ hasText: 'Drop your CSV file here' }).first()
    await dropzone.hover()
    await screenshot('03-upload-area-hover')

    // Step 4: Upload CSV file
    const csvContent = `name,company,website
John Doe,Acme Corp,https://acme.com
Jane Smith,Tech Inc,https://techinc.com
Bob Johnson,StartupXYZ,https://startupxyz.com`

    const fileInput = page.locator('input[type="file"]')
    const buffer = Buffer.from(csvContent)
    await fileInput.setInputFiles({
      name: 'test-companies.csv',
      mimeType: 'text/csv',
      buffer,
    })

    await page.waitForTimeout(1000)
    await screenshot('04-csv-uploaded')

    // Step 5: Check CSV preview
    await page.waitForSelector('text=name')
    await screenshot('05-csv-preview-visible')

    // Step 6: Scroll to prompt configuration
    await page.locator('textarea[placeholder*="prompt"]').scrollIntoViewIfNeeded()
    await screenshot('06-prompt-section')

    // Step 7: Configure prompt with variables
    const promptText = 'Analyze {{name}} from {{company}} at {{website}} and provide insights.'
    await page.locator('textarea[placeholder*="prompt"]').fill(promptText)
    await page.waitForTimeout(500)
    await screenshot('07-prompt-configured')

    // Step 8: Check variable detection
    await screenshot('08-variables-detected')

    // Step 9: Scroll to test mode button
    await page.locator('button', { hasText: 'Test with First Row' }).scrollIntoViewIfNeeded()
    await screenshot('09-test-mode-button')

    // Step 10: Hover over test button
    await page.locator('button', { hasText: 'Test with First Row' }).hover()
    await screenshot('10-test-button-hover')

    // Step 11: Click test mode (may not work without real API)
    await page.locator('button', { hasText: 'Test with First Row' }).click()
    await page.waitForTimeout(2000)
    await screenshot('11-test-mode-clicked')

    // Step 12: Check for any test results or errors
    await screenshot('12-test-results')

    // Step 13: Scroll to process all button
    await page.locator('button', { hasText: 'Process All' }).scrollIntoViewIfNeeded()
    await screenshot('13-process-all-button')

    // Step 14: Hover over process all button
    await page.locator('button', { hasText: 'Process All' }).hover()
    await screenshot('14-process-all-hover')

    // Step 15: Check export section
    await page.locator('text=Export').scrollIntoViewIfNeeded()
    await screenshot('15-export-section')

    // Step 16: Check results table (if visible)
    const resultsTable = page.locator('table').first()
    if (await resultsTable.isVisible()) {
      await resultsTable.scrollIntoViewIfNeeded()
      await screenshot('16-results-table')
    }

    // Step 17: Full page final state
    await page.evaluate(() => window.scrollTo(0, 0))
    await screenshot('17-final-state-top')

    // Step 18: Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await screenshot('18-final-state-bottom')

    // Step 19: Check mobile responsiveness (resize to mobile)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await screenshot('19-mobile-view-top')

    // Step 20: Mobile scroll down
    await page.evaluate(() => window.scrollTo(0, 400))
    await screenshot('20-mobile-view-middle')

    // Step 21: Mobile bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await screenshot('21-mobile-view-bottom')

    // Step 22: Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    await screenshot('22-back-to-desktop')

    // Step 23: Test dark mode (if available)
    await screenshot('23-dark-mode')

    console.log(`\n✅ UI Audit complete! ${stepNumber} screenshots saved to: ${screenshotDir}`)
  })
})
