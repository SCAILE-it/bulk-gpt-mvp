/**
 * Playwright Authentication Setup
 * This script runs once before all tests to create an authenticated session
 * The session is saved and reused by all tests
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

// Test user credentials (must match create-test-user.ts)
const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!'
}

setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...')

  // Navigate to login page
  await page.goto('http://localhost:3333/auth')
  await page.waitForLoadState('networkidle')

  console.log('📧 Filling in credentials...')

  // Fill in login form
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email)
  await page.locator('input[type="password"], input[name="password"]').fill(TEST_USER.password)

  console.log('🚀 Submitting login...')

  // Click sign in button
  await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').click()

  // Wait for redirect after successful login
  await page.waitForURL(/\/(bulk|wizard|dashboard)/, { timeout: 10000 })

  console.log('✅ Login successful!')

  // Verify we're logged in by checking for user menu or navigation
  const isLoggedIn = await page.locator('nav, [data-testid="user-menu"], header').count() > 0
  expect(isLoggedIn).toBeTruthy()

  console.log('💾 Saving authentication state...')

  // Save signed-in state
  await page.context().storageState({ path: authFile })

  console.log(`✅ Authentication state saved to: ${authFile}`)
  console.log('🎉 Setup complete! Tests can now use this authenticated session.')
})
