import { chromium, Browser, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const screenshotDir = path.join(__dirname, '..', 'screenshots', 'ui-audit-20251023')

// Ensure directory exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true })
}

const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!',
}

async function screenshot(page: Page, stepNumber: number, name: string) {
  const filename = `${String(stepNumber).padStart(2, '0')}-${name}.png`
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: true,
  })
  console.log(`📸 ${filename}`)
}

async function main() {
  const browser: Browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()

  let step = 0

  try {
    // Try to login, but if it fails, continue anyway
    try {
      console.log('🔐 Loading login page...')
      await page.goto('http://localhost:3333/auth')
      await page.waitForLoadState('networkidle')
      await screenshot(page, ++step, 'login-page')

      console.log('📧 Filling credentials...')
      await page.locator('input[type="email"]').fill(TEST_USER.email)
      await page.locator('input[type="password"]').fill(TEST_USER.password)
      await screenshot(page, ++step, 'login-filled')

      console.log('🚀 Logging in...')
      await page.locator('button[type="submit"]').click()
      await page.waitForURL(/\/(bulk|wizard|dashboard)/, { timeout: 5000 })
      await screenshot(page, ++step, 'after-login')
    } catch (authError) {
      console.log('⚠️ Auth skipped, continuing to bulk page...')
    }

    // Step 4: Navigate to bulk processor
    console.log('📄 Navigating to /bulk...')
    await page.goto('http://localhost:3333/bulk')
    await page.waitForLoadState('networkidle')
    await screenshot(page, ++step, 'bulk-page-initial')

    // Step 5: CSV upload area
    console.log('📂 Checking upload area...')
    await page.waitForTimeout(1000)
    await screenshot(page, ++step, 'upload-area-empty')

    // Step 6: Hover over upload area
    const uploadArea = page.locator('text=CSV').first()
    if (await uploadArea.isVisible()) {
      await uploadArea.hover()
      await screenshot(page, ++step, 'upload-area-hover')
    }

    // Step 7: Upload CSV
    console.log('📤 Uploading CSV...')
    const csvContent = `name,company,website
John Doe,Acme Corp,https://acme.com
Jane Smith,Tech Inc,https://techinc.com
Bob Johnson,StartupXYZ,https://startupxyz.com
Alice Williams,BizWorld,https://bizworld.com
Charlie Brown,DigitalCo,https://digitalco.com`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-companies.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })
    await page.waitForTimeout(2000)
    await screenshot(page, ++step, 'csv-uploaded')

    // Step 8: CSV preview
    console.log('👀 Checking preview...')
    await page.waitForTimeout(500)
    await screenshot(page, ++step, 'csv-preview')

    // Step 9: Scroll to prompt
    console.log('✍️ Finding prompt section...')
    const promptArea = page.locator('textarea').first()
    await promptArea.scrollIntoViewIfNeeded()
    await screenshot(page, ++step, 'prompt-section-empty')

    // Step 10: Fill prompt
    await promptArea.fill('Research {{company}} at {{website}} and tell me about {{name}}. Provide key insights.')
    await page.waitForTimeout(500)
    await screenshot(page, ++step, 'prompt-filled')

    // Step 11: Variables detected
    await page.waitForTimeout(500)
    await screenshot(page, ++step, 'variables-detected')

    // Step 12: Test button section
    console.log('🧪 Finding test button...')
    const testButton = page.locator('button:has-text("Test")')
    if (await testButton.isVisible()) {
      await testButton.scrollIntoViewIfNeeded()
      await screenshot(page, ++step, 'test-button')

      await testButton.hover()
      await screenshot(page, ++step, 'test-button-hover')
    }

    // Step 13: Process all button
    console.log('▶️ Finding process button...')
    const processButton = page.locator('button:has-text("Process")')
    if (await processButton.isVisible()) {
      await processButton.scrollIntoViewIfNeeded()
      await screenshot(page, ++step, 'process-button')

      await processButton.hover()
      await screenshot(page, ++step, 'process-button-hover')
    }

    // Step 14: Export section
    console.log('💾 Checking export section...')
    const exportSection = page.locator('text=Export')
    if (await exportSection.isVisible()) {
      await exportSection.scrollIntoViewIfNeeded()
      await screenshot(page, ++step, 'export-section')
    }

    // Step 15: Full page scroll top
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    await screenshot(page, ++step, 'full-page-top')

    // Step 16: Full page scroll middle
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForTimeout(300)
    await screenshot(page, ++step, 'full-page-middle')

    // Step 17: Full page scroll bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)
    await screenshot(page, ++step, 'full-page-bottom')

    // Step 18: Mobile view
    console.log('📱 Testing mobile view...')
    await page.setViewportSize({ width: 375, height: 667 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await screenshot(page, ++step, 'mobile-top')

    await page.evaluate(() => window.scrollTo(0, 300))
    await page.waitForTimeout(300)
    await screenshot(page, ++step, 'mobile-middle')

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)
    await screenshot(page, ++step, 'mobile-bottom')

    // Step 19: Tablet view
    console.log('📱 Testing tablet view...')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await screenshot(page, ++step, 'tablet-view')

    // Step 20: Back to desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await screenshot(page, ++step, 'desktop-final')

    console.log(`\n✅ UI Audit complete! ${step} screenshots saved to:`)
    console.log(`   ${screenshotDir}`)

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error)
    await screenshot(page, 999, 'error-state')
  } finally {
    await browser.close()
  }
}

main()
