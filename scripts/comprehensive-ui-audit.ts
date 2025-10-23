import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const screenshotDir = path.join(__dirname, '..', 'screenshots', 'ui-audit-20251023')
fs.mkdirSync(screenshotDir, { recursive: true })

const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!',
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()

  let step = 0
  const screenshot = async (name: string) => {
    step++
    const filename = `${String(step).padStart(2, '0')}-${name}.png`
    await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: true })
    console.log(`📸 ${filename}`)
    return filename
  }

  try {
    console.log('🔐 Step 1: Login')
    await page.goto('http://localhost:3333/auth')
    await page.waitForLoadState('domcontentloaded')
    await screenshot('login-page')

    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await screenshot('login-filled')

    await page.click('button[type="submit"]')

    // Wait for either /bulk, /wizard, or /dashboard
    try {
      await page.waitForURL(/\/(bulk|wizard|dashboard)/, { timeout: 8000 })
      console.log('✅ Logged in, at:', page.url())
    } catch {
      console.log('⚠️ No redirect, trying direct navigation...')
      await page.goto('http://localhost:3333/bulk')
    }

    await page.waitForLoadState('networkidle')
    await screenshot('after-login')

    console.log('\n📄 Step 2: Bulk Processor Page - Initial State')

    // Ensure we're on /bulk
    if (!page.url().includes('/bulk')) {
      await page.goto('http://localhost:3333/bulk')
      await page.waitForLoadState('networkidle')
    }

    await screenshot('bulk-initial-top')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await screenshot('bulk-initial-bottom')

    console.log('\n📤 Step 3: CSV Upload Area')
    await page.evaluate(() => window.scrollTo(0, 0))

    // Find and screenshot upload area
    const uploadSection = page.locator('text=/CSV|upload|drop/i').first()
    if (await uploadSection.isVisible()) {
      await uploadSection.scrollIntoViewIfNeeded()
      await screenshot('upload-section')
    }

    console.log('\n📊 Step 4: Upload CSV & Review')
    // Create CSV programmatically
    const csvContent = `name,company,website,email
John Doe,Acme Corp,https://acme.com,john@acme.com
Jane Smith,Tech Solutions,https://techsolutions.io,jane@techsolutions.io
Bob Johnson,StartupXYZ,https://startupxyz.com,bob@startupxyz.com
Alice Williams,Digital Marketing Co,https://digitalmarketing.co,alice@dm.co
Charlie Brown,Enterprise Software Inc,https://enterprise.com,charlie@enterprise.com`

    // Try to upload using input file
    try {
      const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 3000 })
      await page.click('text=/drop.*csv|upload|browse/i')
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'companies.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      })
      console.log('✅ CSV uploaded via file chooser')
    } catch {
      // Fallback: try direct input
      const input = page.locator('input[type="file"]')
      if (await input.isVisible({ timeout: 2000 })) {
        await input.setInputFiles({
          name: 'companies.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent),
        })
        console.log('✅ CSV uploaded via input')
      }
    }

    await page.waitForTimeout(2000)
    await screenshot('csv-uploaded')

    // Check for preview
    if (await page.locator('text=/name|company|website/i').isVisible({ timeout: 2000 })) {
      await screenshot('csv-preview')
    }

    console.log('\n✍️ Step 5: Configure Prompt')
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible()) {
      await textarea.scrollIntoViewIfNeeded()
      await screenshot('prompt-area-empty')

      await textarea.fill('Research {{company}} at {{website}} and summarize key info about {{name}} ({{email}})')
      await page.waitForTimeout(500)
      await screenshot('prompt-filled')
    }

    console.log('\n🎯 Step 6: UI Controls')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    await screenshot('full-page-with-data')

    // Find buttons
    const buttons = page.locator('button:visible')
    const count = await buttons.count()
    console.log(`Found ${count} buttons`)

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await screenshot('middle-section')

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await screenshot('bottom-section')

    console.log('\n📱 Step 7: Responsive Design')
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await screenshot('mobile-top')
    await page.evaluate(() => window.scrollTo(0, 200))
    await screenshot('mobile-middle')
    await page.evaluate(() => window.scrollTo(0, 500))
    await screenshot('mobile-bottom')

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await screenshot('tablet-view')

    // Desktop wide
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await screenshot('desktop-wide')

    console.log(`\n✅ Captured ${step} screenshots in: ${screenshotDir}`)

  } catch (error) {
    console.error('❌ Error:', error)
    await screenshot('error-state')
  } finally {
    await browser.close()
  }
}

main()
