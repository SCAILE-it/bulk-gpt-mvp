import { test } from '@playwright/test'

test('Take screenshot of production /bulk page after login', async ({ page }) => {
  test.setTimeout(120000) // 2 minutes

  console.log('=== Taking Production Screenshot ===')

  // Navigate to production login
  console.log('1. Navigating to login...')
  await page.goto('https://bulk-gpt-app.vercel.app/auth')

  // Login
  console.log('2. Logging in...')
  await page.waitForSelector('#email', { timeout: 10000 })
  await page.locator('#email').fill('test@bulkgpt.local')
  await page.locator('#password').fill('Test123456!')
  await page.locator('button[type="submit"]').click()

  // Wait for redirect
  await page.waitForURL(/\/(bulk|dashboard)/, { timeout: 30000 })
  console.log('3. Login successful, redirected to:', page.url())

  // Take screenshot of redirect page
  await page.screenshot({
    path: 'screenshots/v2-production-final/01-after-login-redirect.png',
    fullPage: true
  })
  console.log('✓ Screenshot 1: After login redirect')

  // Navigate back to production /bulk
  console.log('4. Navigating to production /bulk...')
  await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)

  // Take screenshot of /bulk page
  await page.screenshot({
    path: 'screenshots/v2-production-final/02-bulk-page.png',
    fullPage: true
  })
  console.log('✓ Screenshot 2: Production /bulk page')

  // Log page content
  const bodyText = await page.locator('body').textContent()
  console.log('Page text preview:', bodyText?.substring(0, 300))

  // Check for file inputs
  const fileInputs = await page.locator('input[type="file"]').count()
  console.log('File inputs found:', fileInputs)

  // Check for other relevant elements
  const buttons = await page.locator('button').count()
  const textareas = await page.locator('textarea').count()
  console.log('Buttons found:', buttons)
  console.log('Textareas found:', textareas)

  console.log('✓ Screenshots saved to screenshots/v2-production-final/')
})
