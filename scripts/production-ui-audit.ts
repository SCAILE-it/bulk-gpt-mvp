import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const screenshotDir = path.join(__dirname, '..', 'screenshots', 'ui-audit-20251023')
fs.mkdirSync(screenshotDir, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()

  let step = 6 // Continue from where we left off
  const screenshot = async (name: string) => {
    step++
    const filename = `${String(step).padStart(2, '0')}-${name}.png`
    await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: true })
    console.log(`📸 ${filename}`)
  }

  try {
    console.log('🌐 Testing PRODUCTION at https://bulk-gpt-app.vercel.app')

    // Step 1: Production login page
    await page.goto('https://bulk-gpt-app.vercel.app/auth')
    await page.waitForLoadState('networkidle')
    await screenshot('prod-login-page')

    // Step 2: Test demo credentials display
    await page.waitForTimeout(500)
    await screenshot('prod-login-with-demo-creds')

    // Step 3: Fill and show
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await screenshot('prod-login-filled')

    // Try logging in with demo credentials
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
    await screenshot('prod-after-login-attempt')

    // Navigate to bulk page directly
    await page.goto('https://bulk-gpt-app.vercel.app/bulk')
    await page.waitForLoadState('networkidle')
    await screenshot('prod-bulk-page')

    // Desktop views at different scroll positions
    await page.evaluate(() => window.scrollTo(0, 0))
    await screenshot('prod-bulk-top')

    await page.evaluate(() => window.scrollTo(0, 300))
    await screenshot('prod-bulk-middle')

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await screenshot('prod-bulk-bottom')

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('https://bulk-gpt-app.vercel.app/auth')
    await page.waitForLoadState('networkidle')
    await screenshot('prod-mobile-login')

    await page.goto('https://bulk-gpt-app.vercel.app/bulk')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => window.scrollTo(0, 0))
    await screenshot('prod-mobile-bulk')

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('https://bulk-gpt-app.vercel.app/bulk')
    await page.waitForLoadState('networkidle')
    await screenshot('prod-tablet-bulk')

    console.log(`\n✅ Captured ${step - 6} production screenshots`)

  } catch (error) {
    console.error('❌ Error:', error)
    await screenshot('prod-error')
  } finally {
    await browser.close()
  }
}

main()
