import { test, expect } from '@playwright/test'

test('localhost:3000 is responding', async ({ page }) => {
  // Navigate to the application
  const response = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })

  // Check that the page loaded successfully
  expect(response?.status()).toBe(200)
  console.log('✓ Server is responding with 200 status')

  // Check that we're redirected to auth (if not logged in)
  expect(page.url()).toContain('/auth')
  console.log('✓ Correctly redirected to auth page')

  // Verify page has content
  const pageTitle = await page.title()
  console.log(`✓ Page title: ${pageTitle}`)

  // Take a screenshot for verification
  await page.screenshot({ path: 'test-localhost-screenshot.png' })
  console.log('✓ Screenshot saved')
})

test('Auth page has login form elements', async ({ page }) => {
  await page.goto('http://localhost:3000/auth', { waitUntil: 'domcontentloaded' })

  // Check for email input
  const emailInput = page.locator('input[type="email"]')
  await expect(emailInput).toBeVisible({ timeout: 10000 })
  console.log('✓ Email input field found')

  // Check for password input
  const passwordInput = page.locator('input[type="password"]').first()
  await expect(passwordInput).toBeVisible()
  console.log('✓ Password input field found')

  // Check for sign in button
  const signInButton = page.locator('button:has-text("Sign in"), button:has-text("Log in")')
  await expect(signInButton.first()).toBeVisible()
  console.log('✓ Sign in button found')
})
