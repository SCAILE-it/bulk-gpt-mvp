/**
 * Playwright Authentication Setup
 * This script runs once before all tests to create an authenticated session
 * The session is saved and reused by all tests
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

// Test user credentials
const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'E2ETest123456!'
}

setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...')

  // Capture console logs and errors
  page.on('console', msg => console.log('Browser console:', msg.text()))
  page.on('pageerror', err => console.error('Page error:', err.message))

  // Track network requests for debugging
  let authApiCalled = false
  page.on('response', response => {
    if (response.url().includes('supabase.co/auth')) {
      console.log(`🌐 Supabase auth API: ${response.status()} - ${response.url()}`)
      authApiCalled = true
    }
  })

  // Navigate to login page
  await page.goto('http://localhost:3334/auth')
  await page.waitForLoadState('networkidle')

  console.log('📧 Waiting for login form to appear...')

  // Wait for form to be fully loaded (handles Suspense)
  await page.waitForSelector('#email', { timeout: 30000 })

  // Take screenshot for debugging
  await page.screenshot({ path: 'test-results/auth-page-loaded.png' })

  console.log('📧 Filling in credentials...')

  // Fill in login form using ID selectors (more reliable)
  await page.locator('#email').fill(TEST_USER.email)
  await page.locator('#password').fill(TEST_USER.password)

  console.log('🚀 Submitting login...')

  // Click sign in button and wait for navigation
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")')

  // Wait for Supabase auth API call to complete
  const authResponsePromise = page.waitForResponse(
    response => response.url().includes('/auth/v1/token') && response.status() === 200,
    { timeout: 10000 }
  ).catch(() => {
    console.warn('⚠️ Did not detect Supabase auth API call')
    return null
  })

  await submitButton.click()

  // Wait for auth API to complete
  const authResponse = await authResponsePromise
  if (authResponse) {
    console.log('✅ Supabase auth API call completed successfully')
  }

  // Give Supabase SSR cookies time to propagate (critical for middleware)
  console.log('⏳ Waiting for session cookies to propagate...')
  await page.waitForTimeout(2000)

  // Check if cookies were set
  const cookies = await page.context().cookies()
  const authCookies = cookies.filter(c => c.name.includes('supabase') || c.name.includes('auth'))
  console.log(`🍪 Found ${authCookies.length} auth cookies:`, authCookies.map(c => c.name).join(', '))

  if (authCookies.length === 0) {
    console.warn('⚠️ No Supabase auth cookies found - login may not have completed')
  }

  // Wait for redirect to complete (to /bulk or /dashboard)
  try {
    await page.waitForURL(/\/(bulk|dashboard)/, { timeout: 30000 })
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

    // Log final state for debugging
    console.error('❌ Login redirect failed')
    console.error('Current URL:', page.url())
    console.error('Auth API called:', authApiCalled)
    console.error('Cookies set:', authCookies.length)

    throw new Error(`Login did not redirect. Current URL: ${page.url()}`)
  }

  console.log('💾 Saving authentication state...')

  // Save signed-in state to file
  await page.context().storageState({ path: authFile })

  console.log(`✅ Authentication state saved to: ${authFile}`)
  console.log('🎉 Setup complete! Tests can now use this authenticated session.')
})
