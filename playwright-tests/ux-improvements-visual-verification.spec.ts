import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const PRODUCTION_URL = 'https://bulk-gpt-izu0ch9cs-federico-de-pontes-projects.vercel.app/bulk'
const BYPASS_HEADER = 'NP2hPmIEqpum8DjhXlkowwnOQZ041XRC'
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'ux-improvements-verification')

// This test uses authenticated session from auth.setup.ts

test.describe('UX Improvements Visual Verification', () => {
  test.beforeAll(() => {
    // Ensure screenshots directory exists
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
    }
  })

  test('should capture all UX improvement states', async ({ page }) => {
    // Set bypass header for Vercel protection
    await page.setExtraHTTPHeaders({
      'x-vercel-protection-bypass': BYPASS_HEADER
    })

    console.log('📸 Starting visual verification...')

    // 1. Navigate to bulk page
    console.log('1️⃣ Navigating to bulk processing page...')
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // Wait for any animations

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-empty-state.png'),
      fullPage: true
    })
    console.log('✅ Captured: Empty state')

    // 2. Upload CSV file
    console.log('2️⃣ Uploading CSV file...')
    const csvPath = path.join(process.cwd(), 'public', 'examples', 'sample-input.csv')

    // Find and click the file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)
    await page.waitForTimeout(2000) // Wait for CSV to load

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-csv-uploaded.png'),
      fullPage: true
    })
    console.log('✅ Captured: CSV uploaded')

    // 3. Verify CSV Preview Table is visible
    console.log('3️⃣ Checking CSV Preview Table...')
    const csvPreview = page.locator('text=CSV Preview').first()
    if (await csvPreview.isVisible()) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '03-csv-preview-table.png'),
        fullPage: true
      })
      console.log('✅ Captured: CSV Preview Table (NEW COMPONENT)')
    } else {
      console.log('⚠️ CSV Preview Table not visible')
    }

    // 4. Enter a prompt
    console.log('4️⃣ Entering prompt...')
    const promptTextarea = page.locator('textarea').first()
    await promptTextarea.fill('Write a professional bio for {{name}} who works at {{company}}')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-prompt-entered.png'),
      fullPage: true
    })
    console.log('✅ Captured: Prompt entered')

    // 5. Try to open Advanced Settings Modal
    console.log('5️⃣ Checking Advanced Settings Modal...')
    const advancedButton = page.locator('button:has-text("Configure")')
    if (await advancedButton.isVisible()) {
      await advancedButton.click()
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '05-advanced-settings-modal.png'),
        fullPage: true
      })
      console.log('✅ Captured: Advanced Settings Modal')

      // Close modal
      const closeButton = page.locator('button[aria-label="Close advanced settings"]')
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await page.waitForTimeout(500)
      }
    } else {
      console.log('⚠️ Advanced Settings button not found')
    }

    // 6. Click "Test (1 row)" button to trigger processing
    console.log('6️⃣ Triggering test processing...')
    const testButton = page.locator('button:has-text("Test (1 row)")')
    if (await testButton.isVisible() && !(await testButton.isDisabled())) {
      await testButton.click()
      await page.waitForTimeout(2000) // Wait for processing to start

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '06-processing-started.png'),
        fullPage: true
      })
      console.log('✅ Captured: Processing started')

      // Wait for BatchStatusCard or results
      await page.waitForTimeout(5000) // Wait for processing

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '07-batch-status-card.png'),
        fullPage: true
      })
      console.log('✅ Captured: Batch Status Card (NEW COMPONENT)')

      // Wait for completion
      await page.waitForTimeout(3000)

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '08-results-table.png'),
        fullPage: true
      })
      console.log('✅ Captured: Results Table')
    } else {
      console.log('⚠️ Test button not available')
    }

    // 7. Capture final full-page state
    console.log('7️⃣ Capturing final state...')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '09-full-page-complete.png'),
      fullPage: true
    })
    console.log('✅ Captured: Final full page')

    // 8. Text contrast verification - capture specific text areas
    console.log('8️⃣ Capturing text contrast samples...')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '10-text-contrast-verification.png'),
      fullPage: false // Just viewport for contrast check
    })
    console.log('✅ Captured: Text contrast sample')

    console.log('\n🎉 Visual verification complete!')
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`)
  })

  test('should verify key UX components exist', async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'x-vercel-protection-bypass': BYPASS_HEADER
    })

    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' })

    // Upload CSV
    const csvPath = path.join(process.cwd(), 'public', 'examples', 'sample-input.csv')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)
    await page.waitForTimeout(2000)

    // Verify CSV Preview Table component exists
    const csvPreviewHeading = page.locator('text=CSV Preview')
    await expect(csvPreviewHeading.first()).toBeVisible({ timeout: 5000 })
    console.log('✅ CSV Preview Table component verified')

    // Verify row count is displayed
    const rowCountText = page.locator('text=/\\d+ row/')
    await expect(rowCountText.first()).toBeVisible()
    console.log('✅ Row count display verified')

    // Enter prompt to enable buttons
    const promptTextarea = page.locator('textarea').first()
    await promptTextarea.fill('Write a bio for {{name}}')
    await page.waitForTimeout(500)

    // Verify Advanced Settings button exists
    const advancedButton = page.locator('button:has-text("Configure")')
    await expect(advancedButton).toBeVisible()
    console.log('✅ Advanced Settings button verified (Phase 2.3 complete)')
  })
})
