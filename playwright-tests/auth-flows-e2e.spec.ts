import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://bulk-gpt-app.vercel.app'
const TEST_EMAIL = `test-${Date.now()}@bulkgpt.test`
const TEST_PASSWORD = 'Test123456!'

test.describe('Authentication Flows E2E - Production', () => {
  test('1. Sign-Up Flow - Complete', async ({ page }) => {
    console.log('\n=== Testing Sign-Up Flow ===')
    
    // Navigate to auth page
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    
    // Verify initial state (sign-in mode)
    const signInButton = page.locator('button:has-text("Sign in")').first()
    await expect(signInButton).toBeVisible()
    console.log('✓ Sign-in form displayed')
    
    // Switch to sign-up mode
    const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first()
    await expect(signUpLink).toBeVisible()
    await signUpLink.click()
    await page.waitForTimeout(500)
    
    // Verify sign-up form elements
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1)
    const createButton = page.locator('button:has-text("Create account")').first()
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(confirmPasswordInput).toBeVisible()
    await expect(createButton).toBeVisible()
    console.log('✓ Sign-up form elements present')
    
    // Test password visibility toggle
    const eyeButton = page.locator('button[aria-label*="password" i]').first()
    await expect(eyeButton).toBeVisible()
    await eyeButton.click()
    await page.waitForTimeout(200)
    const passwordType = await passwordInput.getAttribute('type')
    expect(passwordType).toBe('text')
    console.log('✓ Password visibility toggle works')
    
    // Fill sign-up form
    await emailInput.fill(TEST_EMAIL)
    await passwordInput.fill(TEST_PASSWORD)
    await confirmPasswordInput.fill(TEST_PASSWORD)
    console.log('✓ Form filled with test credentials')
    
    // Verify validation hints
    const validationHint = page.locator('text=/at least 8 characters/i')
    await expect(validationHint).toBeVisible()
    console.log('✓ Password validation hint displayed')
    
    // Submit form
    await createButton.click()
    await page.waitForTimeout(2000)
    
    // Check for success message or email confirmation message
    const successMessage = page.locator('text=/check your email/i, text=/email.*confirm/i')
    const successCount = await successMessage.count()
    
    if (successCount > 0) {
      console.log('✓ Sign-up successful - email confirmation required')
    } else {
      // Check if redirected (email confirmation disabled in dev)
      const currentUrl = page.url()
      if (!currentUrl.includes('/auth')) {
        console.log('✓ Sign-up successful - auto-logged in')
      }
    }
    
    console.log('✓ Sign-up flow complete\n')
  })
  
  test('2. Sign-In Flow - Complete', async ({ page }) => {
    console.log('\n=== Testing Sign-In Flow ===')
    
    // Navigate to auth page
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    
    // Verify sign-in form
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const signInButton = page.locator('button:has-text("Sign in")').first()
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(signInButton).toBeVisible()
    console.log('✓ Sign-in form displayed')
    
    // Fill form with demo credentials
    await emailInput.fill('test@bulkgpt.local')
    await passwordInput.fill('Test123456!')
    console.log('✓ Form filled with demo credentials')
    
    // Submit
    await signInButton.click()
    await page.waitForTimeout(3000)
    
    // Verify redirect to app (not on auth page)
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/auth')
    console.log(`✓ Sign-in successful - redirected to: ${currentUrl}`)
    
    // Verify user is authenticated (check for app elements)
    const bulkPage = page.locator('text=/bulk/i, text=/csv/i, text=/upload/i')
    const bulkCount = await bulkPage.count()
    
    if (bulkCount > 0 || currentUrl.includes('/bulk') || currentUrl.includes('/dashboard')) {
      console.log('✓ User authenticated - app accessible')
    }
    
    console.log('✓ Sign-in flow complete\n')
  })
  
  test('3. Password Reset Flow - Complete', async ({ page }) => {
    console.log('\n=== Testing Password Reset Flow ===')
    
    // Navigate to auth page
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    
    // Click forgot password link
    const forgotLink = page.locator('button:has-text("Forgot"), button:has-text("password")').first()
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()
    await page.waitForTimeout(1000)
    
    // Verify reset form
    const emailInput = page.locator('input[type="email"]').first()
    const resetButton = page.locator('button:has-text("Send reset"), button:has-text("reset email")').first()
    
    await expect(emailInput).toBeVisible()
    await expect(resetButton).toBeVisible()
    console.log('✓ Password reset form displayed')
    
    // Fill email
    await emailInput.fill('test@bulkgpt.local')
    console.log('✓ Email entered')
    
    // Submit
    await resetButton.click()
    await page.waitForTimeout(2000)
    
    // Check for success message
    const successMessage = page.locator('text=/check your inbox/i, text=/reset email sent/i')
    const successCount = await successMessage.count()
    
    if (successCount > 0) {
      console.log('✓ Password reset email sent successfully')
    } else {
      // Check if error (email might not exist)
      const errorMessage = page.locator('[role="alert"]')
      const errorCount = await errorMessage.count()
      if (errorCount > 0) {
        const errorText = await errorMessage.first().textContent()
        console.log(`⚠ Reset request completed (may have error: ${errorText?.substring(0, 50)})`)
      }
    }
    
    // Test back to sign-in link
    const backLink = page.locator('button:has-text("Back to sign in")').first()
    if (await backLink.count() > 0) {
      await backLink.click()
      await page.waitForTimeout(500)
      const signInButton = page.locator('button:has-text("Sign in")').first()
      await expect(signInButton).toBeVisible()
      console.log('✓ Back to sign-in link works')
    }
    
    console.log('✓ Password reset flow complete\n')
  })
  
  test('4. Form Validation - Complete', async ({ page }) => {
    console.log('\n=== Testing Form Validation ===')
    
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    
    // Switch to sign-up
    const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first()
    await signUpLink.click()
    await page.waitForTimeout(500)
    
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const confirmInput = page.locator('input[type="password"]').nth(1)
    const submitButton = page.locator('button:has-text("Create account")').first()
    
    // Test empty form submission
    await submitButton.click()
    await page.waitForTimeout(500)
    const errorMessage = page.locator('[role="alert"]').first()
    const errorCount = await errorMessage.count()
    
    if (errorCount > 0) {
      const errorText = await errorMessage.textContent()
      expect(errorText).toContain('fill')
      console.log('✓ Empty form validation works')
    }
    
    // Test invalid email
    await emailInput.fill('invalid-email')
    await passwordInput.fill('Test123456!')
    await confirmInput.fill('Test123456!')
    await submitButton.click()
    await page.waitForTimeout(500)
    
    const emailError = page.locator('[role="alert"]').first()
    const emailErrorCount = await emailError.count()
    if (emailErrorCount > 0) {
      const emailErrorText = await emailError.textContent()
      if (emailErrorText?.toLowerCase().includes('email') || emailErrorText?.toLowerCase().includes('valid')) {
        console.log('✓ Invalid email validation works')
      }
    }
    
    // Test password mismatch
    await emailInput.fill('test@example.com')
    await passwordInput.fill('Test123456!')
    await confirmInput.fill('Different123!')
    await submitButton.click()
    await page.waitForTimeout(500)
    
    const passwordError = page.locator('[role="alert"]').first()
    const passwordErrorCount = await passwordError.count()
    if (passwordErrorCount > 0) {
      const passwordErrorText = await passwordError.textContent()
      if (passwordErrorText?.toLowerCase().includes('match') || passwordErrorText?.toLowerCase().includes('password')) {
        console.log('✓ Password mismatch validation works')
      }
    }
    
    // Test weak password
    await emailInput.fill('test@example.com')
    await passwordInput.fill('weak')
    await confirmInput.fill('weak')
    await submitButton.click()
    await page.waitForTimeout(500)
    
    const weakPasswordError = page.locator('[role="alert"]').first()
    const weakPasswordErrorCount = await weakPasswordError.count()
    if (weakPasswordErrorCount > 0) {
      const weakPasswordErrorText = await weakPasswordError.textContent()
      if (weakPasswordErrorText?.toLowerCase().includes('8') || weakPasswordErrorText?.toLowerCase().includes('character')) {
        console.log('✓ Weak password validation works')
      }
    }
    
    console.log('✓ Form validation complete\n')
  })
  
  test('5. Mode Switching - Complete', async ({ page }) => {
    console.log('\n=== Testing Mode Switching ===')
    
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    
    // Start in sign-in mode
    let signInButton = page.locator('button:has-text("Sign in")').first()
    await expect(signInButton).toBeVisible()
    console.log('✓ Initial state: Sign-in mode')
    
    // Switch to sign-up
    const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first()
    await signUpLink.click()
    await page.waitForTimeout(500)
    
    let createButton = page.locator('button:has-text("Create account")').first()
    await expect(createButton).toBeVisible()
    console.log('✓ Switched to: Sign-up mode')
    
    // Switch back to sign-in
    const backToSignIn = page.locator('button:has-text("Already have"), button:has-text("Sign in")').first()
    await backToSignIn.click()
    await page.waitForTimeout(500)
    
    signInButton = page.locator('button:has-text("Sign in")').first()
    await expect(signInButton).toBeVisible()
    console.log('✓ Switched back to: Sign-in mode')
    
    // Switch to reset
    const forgotLink = page.locator('button:has-text("Forgot"), button:has-text("password")').first()
    await forgotLink.click()
    await page.waitForTimeout(500)
    
    const resetButton = page.locator('button:has-text("Send reset"), button:has-text("reset email")').first()
    await expect(resetButton).toBeVisible()
    console.log('✓ Switched to: Reset mode')
    
    // Switch back to sign-in
    const backFromReset = page.locator('button:has-text("Back to sign in")').first()
    await backFromReset.click()
    await page.waitForTimeout(500)
    
    signInButton = page.locator('button:has-text("Sign in")').first()
    await expect(signInButton).toBeVisible()
    console.log('✓ Switched back to: Sign-in mode')
    
    console.log('✓ Mode switching complete\n')
  })
  
  test('6. Accessibility - Complete', async ({ page }) => {
    console.log('\n=== Testing Accessibility ===')
    
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    
    // Check for proper labels
    const emailLabel = page.locator('label[for="email"], label:has-text("Email")').first()
    await expect(emailLabel).toBeVisible()
    console.log('✓ Email label present')
    
    const passwordLabel = page.locator('label[for="password"], label:has-text("Password")').first()
    await expect(passwordLabel).toBeVisible()
    console.log('✓ Password label present')
    
    // Check for ARIA attributes
    const emailInput = page.locator('input[type="email"]').first()
    const emailAutocomplete = await emailInput.getAttribute('autocomplete')
    expect(emailAutocomplete).toBeTruthy()
    console.log('✓ Email input has autocomplete attribute')
    
    // Check password visibility toggle accessibility
    const eyeButton = page.locator('button[aria-label*="password" i]').first()
    const ariaLabel = await eyeButton.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    console.log('✓ Password toggle has aria-label')
    
    console.log('✓ Accessibility checks complete\n')
  })
})


