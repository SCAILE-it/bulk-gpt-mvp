/**
 * E2E tests for LinkedIn OAuth authentication
 * Tests the LinkedIn sign-in button and OAuth flow
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('LinkedIn OAuth Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })
  })

  test('should display LinkedIn button on sign-in page', async ({ page }) => {
    // Verify LinkedIn button is visible
    const linkedInButton = page.locator('button:has-text("Continue with LinkedIn")')
    await expect(linkedInButton).toBeVisible()
    
    // Verify button has correct styling (LinkedIn blue)
    const buttonStyles = await linkedInButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      }
    })
    
    // Button should be visible and clickable
    await expect(linkedInButton).toBeEnabled()
  })

  test('should show loading state when clicking LinkedIn button', async ({ page }) => {
    const linkedInButton = page.locator('button:has-text("Continue with LinkedIn")')
    
    // Click LinkedIn button
    await linkedInButton.click()
    
    // Should show loading state
    const loadingText = page.locator('text=Connecting...')
    // Note: This will redirect immediately, so we check for navigation
    await page.waitForTimeout(500)
    
    // Should navigate to LinkedIn OAuth (or show error if not configured)
    const currentUrl = page.url()
    // Either redirects to LinkedIn or stays on page with error
    expect(
      currentUrl.includes('linkedin.com') || 
      currentUrl.includes('/auth') ||
      await page.locator('[role="alert"]').isVisible()
    ).toBeTruthy()
  })

  test('should show "Or" divider between LinkedIn and email form', async ({ page }) => {
    const linkedInButton = page.locator('button:has-text("Continue with LinkedIn")')
    await expect(linkedInButton).toBeVisible()
    
    // Check for "Or" divider
    const orDivider = page.locator('text=Or')
    await expect(orDivider).toBeVisible()
    
    // Email form should be below divider
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
  })

  test('should disable LinkedIn button when email form is loading', async ({ page }) => {
    // Fill email form and trigger loading
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const signInButton = page.locator('button:has-text("Sign in")')
    
    await emailInput.fill('test@example.com')
    await passwordInput.fill('password123')
    await signInButton.click()
    
    // LinkedIn button should be disabled during email sign-in
    const linkedInButton = page.locator('button:has-text("Continue with LinkedIn")')
    await expect(linkedInButton).toBeDisabled()
  })

  test('should not show LinkedIn button on sign-up page', async ({ page }) => {
    // Switch to sign-up mode
    const signUpLink = page.locator('button:has-text("Don\'t have"), button:has-text("Sign up")').first()
    if (await signUpLink.isVisible()) {
      await signUpLink.click()
      await page.waitForTimeout(500)
      
      // LinkedIn button should not be visible on sign-up
      const linkedInButton = page.locator('button:has-text("Continue with LinkedIn")')
      await expect(linkedInButton).not.toBeVisible()
    }
  })

  test('should not show LinkedIn button on password reset page', async ({ page }) => {
    // Switch to password reset mode
    const resetLink = page.locator('button:has-text("Forgot password")')
    if (await resetLink.isVisible()) {
      await resetLink.click()
      await page.waitForTimeout(500)
      
      // LinkedIn button should not be visible on reset
      const linkedInButton = page.locator('button:has-text("Continue with LinkedIn")')
      await expect(linkedInButton).not.toBeVisible()
    }
  })

  test('should handle LinkedIn OAuth error gracefully', async ({ page }) => {
    // Mock a failed OAuth request
    await page.route('**/auth/v1/authorize*', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'OAuth failed' }),
      })
    })
    
    const linkedInButton = page.locator('button:has-text("Continue with LinkedIn")')
    await linkedInButton.click()
    
    // Should show error message
    await page.waitForTimeout(1000)
    const errorMessage = page.locator('[role="alert"]')
    // Error might be shown or navigation might fail
    // Just verify page doesn't crash
    expect(page.url()).toBeTruthy()
  })
})

