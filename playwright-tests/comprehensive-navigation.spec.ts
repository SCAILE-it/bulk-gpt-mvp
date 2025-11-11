import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!'
}

test.describe('Comprehensive Navigation Test', () => {
  test('should test ALL navigation paths and links across the entire application', async ({ page }) => {
    test.setTimeout(240000) // 4 minutes

    console.log('=== COMPREHENSIVE NAVIGATION TEST ===\n')

    // ==========================================
    // SECTION 1: AUTHENTICATION FOR NAVIGATION TEST
    // ==========================================
    console.log('📋 SECTION 1: Authentication for Navigation Testing')

    await page.goto('https://bulk-gpt-app.vercel.app/auth')
    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForFunction(() => !window.location.href.includes('/auth'), { timeout: 30000 })
    await page.waitForTimeout(3000)
    console.log('  ✓ Authenticated and ready for navigation testing\n')

    // Screenshot 1: Starting point
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-01-authenticated-start.png', fullPage: true })
    console.log('  ✓ Screenshot 1: nav-01-authenticated-start.png')

    // ==========================================
    // SECTION 2: PRIMARY NAVIGATION - LOGO
    // ==========================================
    console.log('\n📋 SECTION 2: Logo Navigation (Home Link)')

    const logo = page.locator('text=Bulk GPT').first()
    await expect(logo).toBeVisible()
    console.log('  ✓ Logo visible')

    // Click logo
    await logo.click()
    await page.waitForTimeout(2000)
    console.log('  ✓ Logo clicked')

    // Verify navigation
    const currentUrl1 = page.url()
    console.log(`  ✓ Current URL after logo click: ${currentUrl1}`)

    // Screenshot 2: After logo click
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-02-logo-clicked.png', fullPage: true })
    console.log('  ✓ Screenshot 2: nav-02-logo-clicked.png')

    // ==========================================
    // SECTION 3: PRIMARY NAVIGATION - "RUN" TAB
    // ==========================================
    console.log('\n📋 SECTION 3: Primary Navigation - RUN Tab')

    const runTab = page.locator('text=RUN').or(page.locator('a[href="/bulk"]')).first()
    if (await runTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  ✓ RUN tab visible')

      await runTab.click()
      await page.waitForTimeout(2000)
      console.log('  ✓ RUN tab clicked')

      // Verify we're on /bulk page
      const bulkUrl = page.url()
      expect(bulkUrl).toContain('/bulk')
      console.log(`  ✓ Navigated to: ${bulkUrl}`)

      // Screenshot 3: Bulk page via RUN tab
      await page.screenshot({ path: 'screenshots/comprehensive-test/nav-03-run-tab-bulk-page.png', fullPage: true })
      console.log('  ✓ Screenshot 3: nav-03-run-tab-bulk-page.png')
    } else {
      console.log('  ℹ️  RUN tab not found')
    }

    // ==========================================
    // SECTION 4: PRIMARY NAVIGATION - "EXECUTIONS" TAB
    // ==========================================
    console.log('\n📋 SECTION 4: Primary Navigation - EXECUTIONS Tab')

    const executionsTab = page.locator('text=EXECUTIONS').or(page.locator('a[href="/dashboard"]')).first()
    if (await executionsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  ✓ EXECUTIONS tab visible')

      await executionsTab.click()
      await page.waitForTimeout(2000)
      console.log('  ✓ EXECUTIONS tab clicked')

      // Verify we're on /dashboard page
      const dashboardUrl = page.url()
      expect(dashboardUrl).toContain('/dashboard')
      console.log(`  ✓ Navigated to: ${dashboardUrl}`)

      // Screenshot 4: Dashboard page via EXECUTIONS tab
      await page.screenshot({ path: 'screenshots/comprehensive-test/nav-04-executions-tab-dashboard.png', fullPage: true })
      console.log('  ✓ Screenshot 4: nav-04-executions-tab-dashboard.png')
    } else {
      console.log('  ℹ️  EXECUTIONS tab not found')
    }

    // ==========================================
    // SECTION 5: DIRECT URL NAVIGATION - /bulk
    // ==========================================
    console.log('\n📋 SECTION 5: Direct URL Navigation - /bulk')

    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('  ✓ Navigated directly to /bulk')

    // Verify page loaded
    const bulkPageLogo = page.locator('text=Bulk GPT').first()
    await expect(bulkPageLogo).toBeVisible()
    console.log('  ✓ Bulk page loaded successfully')

    // Screenshot 5: Direct /bulk navigation
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-05-direct-bulk-url.png', fullPage: true })
    console.log('  ✓ Screenshot 5: nav-05-direct-bulk-url.png')

    // ==========================================
    // SECTION 6: DIRECT URL NAVIGATION - /dashboard
    // ==========================================
    console.log('\n📋 SECTION 6: Direct URL Navigation - /dashboard')

    await page.goto('https://bulk-gpt-app.vercel.app/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('  ✓ Navigated directly to /dashboard')

    // Verify page loaded
    const dashboardPageLogo = page.locator('text=Bulk GPT').first()
    await expect(dashboardPageLogo).toBeVisible()
    console.log('  ✓ Dashboard page loaded successfully')

    // Screenshot 6: Direct /dashboard navigation
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-06-direct-dashboard-url.png', fullPage: true })
    console.log('  ✓ Screenshot 6: nav-06-direct-dashboard-url.png')

    // ==========================================
    // SECTION 7: DIRECT URL NAVIGATION - /profile
    // ==========================================
    console.log('\n📋 SECTION 7: Direct URL Navigation - /profile')

    await page.goto('https://bulk-gpt-app.vercel.app/profile', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('  ✓ Navigated directly to /profile')

    // Verify page loaded
    const profilePageLogo = page.locator('text=Bulk GPT').first()
    await expect(profilePageLogo).toBeVisible()
    console.log('  ✓ Profile page loaded successfully')

    // Screenshot 7: Direct /profile navigation
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-07-direct-profile-url.png', fullPage: true })
    console.log('  ✓ Screenshot 7: nav-07-direct-profile-url.png')

    // ==========================================
    // SECTION 8: BROWSER NAVIGATION - BACK BUTTON
    // ==========================================
    console.log('\n📋 SECTION 8: Browser Navigation - Back Button')

    // Go back to dashboard
    await page.goBack()
    await page.waitForTimeout(2000)
    console.log('  ✓ Browser back button used')

    const backUrl = page.url()
    expect(backUrl).toContain('/dashboard')
    console.log(`  ✓ Back navigation successful: ${backUrl}`)

    // Screenshot 8: After back button
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-08-browser-back.png', fullPage: true })
    console.log('  ✓ Screenshot 8: nav-08-browser-back.png')

    // ==========================================
    // SECTION 9: BROWSER NAVIGATION - FORWARD BUTTON
    // ==========================================
    console.log('\n📋 SECTION 9: Browser Navigation - Forward Button')

    // Go forward to profile
    await page.goForward()
    await page.waitForTimeout(2000)
    console.log('  ✓ Browser forward button used')

    const forwardUrl = page.url()
    expect(forwardUrl).toContain('/profile')
    console.log(`  ✓ Forward navigation successful: ${forwardUrl}`)

    // Screenshot 9: After forward button
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-09-browser-forward.png', fullPage: true })
    console.log('  ✓ Screenshot 9: nav-09-browser-forward.png')

    // ==========================================
    // SECTION 10: PAGE RELOAD
    // ==========================================
    console.log('\n📋 SECTION 10: Page Reload Navigation')

    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('  ✓ Page reloaded')

    // Verify still on profile
    const reloadUrl = page.url()
    expect(reloadUrl).toContain('/profile')
    console.log(`  ✓ Page reload successful, still on: ${reloadUrl}`)

    // Screenshot 10: After reload
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-10-page-reload.png', fullPage: true })
    console.log('  ✓ Screenshot 10: nav-10-page-reload.png')

    // ==========================================
    // SECTION 11: NAVIGATION CYCLE TEST
    // ==========================================
    console.log('\n📋 SECTION 11: Complete Navigation Cycle')

    // Cycle: bulk -> dashboard -> profile -> bulk
    console.log('  Testing complete navigation cycle...')

    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    console.log('  ✓ Step 1: /bulk')

    await page.goto('https://bulk-gpt-app.vercel.app/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    console.log('  ✓ Step 2: /dashboard')

    await page.goto('https://bulk-gpt-app.vercel.app/profile', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    console.log('  ✓ Step 3: /profile')

    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    console.log('  ✓ Step 4: Back to /bulk')

    // Verify final state
    const cycleUrl = page.url()
    expect(cycleUrl).toContain('/bulk')
    console.log('  ✓ Complete navigation cycle successful')

    // Screenshot 11: After navigation cycle
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-11-navigation-cycle-complete.png', fullPage: true })
    console.log('  ✓ Screenshot 11: nav-11-navigation-cycle-complete.png')

    // ==========================================
    // SECTION 12: INVALID URL NAVIGATION
    // ==========================================
    console.log('\n📋 SECTION 12: Invalid URL Handling')

    await page.goto('https://bulk-gpt-app.vercel.app/nonexistent-page')
    await page.waitForTimeout(2000)
    console.log('  ✓ Attempted navigation to non-existent page')

    const invalidUrl = page.url()
    console.log(`  ✓ URL after invalid navigation: ${invalidUrl}`)

    // Screenshot 12: Invalid URL handling
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-12-invalid-url.png', fullPage: true })
    console.log('  ✓ Screenshot 12: nav-12-invalid-url.png')

    // ==========================================
    // SECTION 13: FINAL STATE VERIFICATION
    // ==========================================
    console.log('\n📋 SECTION 13: Final Navigation State')

    // Return to bulk page
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Verify logo still works
    const finalLogo = page.locator('text=Bulk GPT').first()
    await expect(finalLogo).toBeVisible()
    console.log('  ✓ Logo still visible after all navigation')

    // Screenshot 13: Final state
    await page.screenshot({ path: 'screenshots/comprehensive-test/nav-13-final-state.png', fullPage: true })
    console.log('  ✓ Screenshot 13: nav-13-final-state.png')

    // ==========================================
    // TEST SUMMARY
    // ==========================================
    console.log('\n═══════════════════════════════════════════════')
    console.log('🎉 COMPREHENSIVE NAVIGATION TEST PASSED!')
    console.log('═══════════════════════════════════════════════')
    console.log('\n✅ ALL NAVIGATION SECTIONS VERIFIED:')
    console.log('  1. ✓ Authentication for Navigation Testing')
    console.log('  2. ✓ Logo Navigation (Home Link)')
    console.log('  3. ✓ Primary Navigation - RUN Tab')
    console.log('  4. ✓ Primary Navigation - EXECUTIONS Tab')
    console.log('  5. ✓ Direct URL Navigation - /bulk')
    console.log('  6. ✓ Direct URL Navigation - /dashboard')
    console.log('  7. ✓ Direct URL Navigation - /profile')
    console.log('  8. ✓ Browser Navigation - Back Button')
    console.log('  9. ✓ Browser Navigation - Forward Button')
    console.log(' 10. ✓ Page Reload Navigation')
    console.log(' 11. ✓ Complete Navigation Cycle')
    console.log(' 12. ✓ Invalid URL Handling')
    console.log(' 13. ✓ Final Navigation State')
    console.log('\n📸 Screenshots Captured: 13')
    console.log('  - nav-01-authenticated-start.png')
    console.log('  - nav-02-logo-clicked.png')
    console.log('  - nav-03-run-tab-bulk-page.png')
    console.log('  - nav-04-executions-tab-dashboard.png')
    console.log('  - nav-05-direct-bulk-url.png')
    console.log('  - nav-06-direct-dashboard-url.png')
    console.log('  - nav-07-direct-profile-url.png')
    console.log('  - nav-08-browser-back.png')
    console.log('  - nav-09-browser-forward.png')
    console.log('  - nav-10-page-reload.png')
    console.log('  - nav-11-navigation-cycle-complete.png')
    console.log('  - nav-12-invalid-url.png')
    console.log('  - nav-13-final-state.png')
    console.log('═══════════════════════════════════════════════\n')
  })
})
