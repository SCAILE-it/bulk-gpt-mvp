import { test } from '@playwright/test'

test('Production V2 screenshot test with proper auth wait', async ({ page }) => {
  test.setTimeout(180000) // 3 minutes

  console.log('=== V2 Production Test with Auth ===')

  // Navigate to production
  await page.goto('https://bulk-gpt-app.vercel.app/auth')

  // Login
  console.log('Logging in...')
  await page.locator('#email').fill('test@bulkgpt.local')
  await page.locator('#password').fill('Test123456!')
  await page.locator('button[type="submit"]').click()

  // Wait for auth to complete - look for bulk page elements
  console.log('Waiting for auth to complete...')

  // Try multiple strategies to wait for authenticated state
  try {
    // Strategy 1: Wait for redirect away from /auth
    await page.waitForFunction(() => !window.location.href.includes('/auth'), { timeout: 30000 })
    console.log('✓ Redirected away from /auth')
  } catch (e) {
    console.log('⚠️ Still on /auth page, checking cookies...')
  }

  // Wait for auth cookies
  await page.waitForTimeout(5000)

  // Navigate to bulk page
  console.log('Navigating to /bulk...')
  await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle', timeout: 60000 })

  // Wait for page to be interactive
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(5000) // Extra wait for React

  // Take screenshot
  await page.screenshot({
    path: 'screenshots/v2-production-final/03-bulk-authenticated.png',
    fullPage: true
  })
  console.log('✓ Screenshot saved')

  // Check what's on the page
  const url = page.url()
  const title = await page.title()
  console.log('Current URL:', url)
  console.log('Page title:', title)

  // Try to find upload interface with multiple selectors
  const selectors = {
    fileInput: await page.locator('input[type="file"]').count(),
    textareas: await page.locator('textarea').count(),
    buttons: await page.locator('button').count(),
    hasUploadText: await page.locator('text=/upload|csv|file/i').count(),
    hasPromptText: await page.locator('text=/prompt/i').count(),
  }

  console.log('Page elements:', JSON.stringify(selectors, null, 2))

  // Get page text content
  const bodyText = await page.locator('body').textContent()
  console.log('Body text preview:', bodyText?.substring(0, 500))

  // Check if we're still on login page
  const isLoginPage = bodyText?.includes('Sign in to start processing')
  console.log('Is login page?', isLoginPage)

  if (isLoginPage) {
    console.log('❌ Still showing login page - auth did not complete')
  } else {
    console.log('✅ Not on login page - checking for bulk interface...')
  }
})
