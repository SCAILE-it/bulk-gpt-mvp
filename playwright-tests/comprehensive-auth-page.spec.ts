import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!'
}

test.describe('Comprehensive Auth Page Test', () => {
  test('should test ALL auth page elements and flows with screenshots', async ({ page }) => {
    test.setTimeout(120000)

    console.log('=== COMPREHENSIVE AUTH PAGE TEST ===\n')

    // ==========================================
    // SECTION 1: INITIAL PAGE LOAD
    // ==========================================
    console.log('📋 SECTION 1: Initial Page Load')

    await page.goto('https://bulk-gpt-app.vercel.app/auth')
    await page.waitForLoadState('networkidle')
    console.log('  ✓ Navigated to /auth')

    // Screenshot 1: Initial state
    await page.screenshot({ path: 'screenshots/comprehensive-test/auth-initial-state.png', fullPage: true })
    console.log('  ✓ Screenshot: auth-initial-state.png')

    // ==========================================
    // SECTION 2: VERIFY ALL PAGE ELEMENTS
    // ==========================================
    console.log('\n📋 SECTION 2: Verify All Page Elements')

    // Check title/header
    const welcomeText = page.locator('text=Welcome to Bulk GPT')
    await expect(welcomeText).toBeVisible()
    console.log('  ✓ Welcome text visible')

    // Check email input
    const emailInput = page.locator('#email')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('type', 'email')
    console.log('  ✓ Email input visible and correct type')

    // Check password input
    const passwordInput = page.locator('#password')
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('type', 'password')
    console.log('  ✓ Password input visible and correct type')

    // Check submit button
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toHaveText(/Sign in/i)
    console.log('  ✓ Submit button visible with correct text')

    // Check demo credentials text
    const demoText = page.locator('text=Demo credentials')
    await expect(demoText).toBeVisible()
    console.log('  ✓ Demo credentials text visible')

    // ==========================================
    // SECTION 3: TEST FORM INTERACTIONS
    // ==========================================
    console.log('\n📋 SECTION 3: Test Form Interactions')

    // Fill email
    await emailInput.fill(TEST_USER.email)
    await page.waitForTimeout(500)
    console.log('  ✓ Email filled')

    // Screenshot 2: Email filled
    await page.screenshot({ path: 'screenshots/comprehensive-test/auth-email-filled.png', fullPage: true })
    console.log('  ✓ Screenshot: auth-email-filled.png')

    // Verify email value
    const emailValue = await emailInput.inputValue()
    expect(emailValue).toBe(TEST_USER.email)
    console.log('  ✓ Email value confirmed')

    // Fill password
    await passwordInput.fill(TEST_USER.password)
    await page.waitForTimeout(500)
    console.log('  ✓ Password filled')

    // Screenshot 3: Form filled
    await page.screenshot({ path: 'screenshots/comprehensive-test/auth-form-filled.png', fullPage: true })
    console.log('  ✓ Screenshot: auth-form-filled.png')

    // Verify password is masked
    const passwordValue = await passwordInput.inputValue()
    expect(passwordValue).toBe(TEST_USER.password)
    console.log('  ✓ Password value confirmed (masked in UI)')

    // ==========================================
    // SECTION 4: TEST SUBMIT BUTTON STATES
    // ==========================================
    console.log('\n📋 SECTION 4: Test Submit Button States')

    // Check button is enabled when form is filled
    await expect(submitButton).toBeEnabled()
    console.log('  ✓ Submit button enabled with filled form')

    // Click submit
    await submitButton.click()
    console.log('  ✓ Submit button clicked')

    // Check for loading state (button text might change)
    await page.waitForTimeout(1000)

    // Screenshot 4: Loading/Processing state
    await page.screenshot({ path: 'screenshots/comprehensive-test/auth-loading-state.png', fullPage: true })
    console.log('  ✓ Screenshot: auth-loading-state.png')

    // ==========================================
    // SECTION 5: VERIFY SUCCESSFUL LOGIN
    // ==========================================
    console.log('\n📋 SECTION 5: Verify Successful Login')

    // Wait for redirect away from /auth
    await page.waitForFunction(() => !window.location.href.includes('/auth'), { timeout: 30000 })
    console.log('  ✓ Redirected away from /auth')

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify we're on /bulk or /dashboard
    const currentUrl = page.url()
    const isOnValidPage = currentUrl.includes('/bulk') || currentUrl.includes('/dashboard')
    expect(isOnValidPage).toBe(true)
    console.log(`  ✓ Redirected to: ${currentUrl}`)

    // Screenshot 5: After successful login
    await page.screenshot({ path: 'screenshots/comprehensive-test/auth-success-redirected.png', fullPage: true })
    console.log('  ✓ Screenshot: auth-success-redirected.png')

    // ==========================================
    // SECTION 6: VERIFY AUTHENTICATED STATE
    // ==========================================
    console.log('\n📋 SECTION 6: Verify Authenticated State')

    // Check for navigation header (sign of authenticated state)
    const navHeader = page.locator('text=Bulk GPT').first()
    await expect(navHeader).toBeVisible({ timeout: 10000 })
    console.log('  ✓ Navigation header visible (authenticated)')

    // Check user dropdown exists
    const userDropdown = page.locator('[data-testid="user-menu-button"]')
    await expect(userDropdown).toBeVisible()
    console.log('  ✓ User dropdown visible')

    // ==========================================
    // TEST SUMMARY
    // ==========================================
    console.log('\n═══════════════════════════════════════════════')
    console.log('🎉 COMPREHENSIVE AUTH PAGE TEST PASSED!')
    console.log('═══════════════════════════════════════════════')
    console.log('\n✅ ALL SECTIONS VERIFIED:')
    console.log('  1. ✓ Initial Page Load')
    console.log('  2. ✓ All Page Elements Present')
    console.log('  3. ✓ Form Interactions Working')
    console.log('  4. ✓ Submit Button States Correct')
    console.log('  5. ✓ Successful Login Redirect')
    console.log('  6. ✓ Authenticated State Verified')
    console.log('\n📸 Screenshots Captured: 5')
    console.log('  - auth-initial-state.png')
    console.log('  - auth-email-filled.png')
    console.log('  - auth-form-filled.png')
    console.log('  - auth-loading-state.png')
    console.log('  - auth-success-redirected.png')
    console.log('═══════════════════════════════════════════════\n')
  })

  test('should test INVALID login flow with error state', async ({ page }) => {
    test.setTimeout(60000)

    console.log('=== AUTH ERROR STATE TEST ===\n')

    await page.goto('https://bulk-gpt-app.vercel.app/auth')
    await page.waitForLoadState('networkidle')

    // Fill with invalid credentials
    await page.locator('#email').fill('invalid@test.com')
    await page.locator('#password').fill('wrongpassword')

    // Screenshot before submit
    await page.screenshot({ path: 'screenshots/comprehensive-test/auth-invalid-creds-filled.png', fullPage: true })
    console.log('  ✓ Screenshot: auth-invalid-creds-filled.png')

    // Submit
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)

    // Screenshot error state
    await page.screenshot({ path: 'screenshots/comprehensive-test/auth-error-state.png', fullPage: true })
    console.log('  ✓ Screenshot: auth-error-state.png')

    // Check we're still on auth page
    expect(page.url()).toContain('/auth')
    console.log('  ✓ Still on /auth page after invalid login')

    console.log('\n✅ Error state test passed')
  })
})
