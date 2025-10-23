/**
 * Playwright Authentication Setup
 * This script runs once before all tests to create an authenticated session
 * The session is saved and reused by all tests
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

// Test user credentials - using demo credentials shown on login page
const TEST_USER = {
  email: 'test@example.com',
  password: 'password'
}

setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...')

  // Capture console logs and errors
  page.on('console', msg => console.log('Browser console:', msg.text()))
  page.on('pageerror', err => console.error('Page error:', err.message))

  // Navigate to login page
  await page.goto('http://localhost:3333/auth')
  await page.waitForLoadState('networkidle')

  console.log('📧 Filling in credentials...')

  // Fill in login form
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email)
  await page.locator('input[type="password"], input[name="password"]').fill(TEST_USER.password)

  console.log('🚀 Submitting login...')

  // Click sign in button and wait for URL change
  await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').click()

  // Wait for redirect to complete (to /wizard, /bulk, or /dashboard)
  try {
    await page.waitForURL(/\/(bulk|wizard|dashboard)/, { timeout: 20000 })
    console.log(`✅ Login successful! Redirected to: ${page.url()}`)
  } catch (err) {
    // Check for error messages on the page
    const errorMessage = await page.locator('.bg-destructive\\/10, [class*="error"], [class*="alert"]').textContent().catch(() => null)
    if (errorMessage) {
      console.error('❌ Login error displayed on page:', errorMessage)
      throw new Error(`Login failed: ${errorMessage}`)
    }

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/auth-failed.png' })
    throw new Error(`Login did not redirect. Current URL: ${page.url()}`)
  }

  console.log('💾 Saving authentication state...')

  // Save signed-in state to file
  await page.context().storageState({ path: authFile })

  console.log(`✅ Authentication state saved to: ${authFile}`)
  console.log('🎉 Setup complete! Tests can now use this authenticated session.')
})
