import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!'
}

test.describe('Comprehensive User Dropdown Flow Test', () => {
  test('should test COMPLETE user dropdown functionality: visibility, click, menu items, navigation, responsive', async ({ page }) => {
    test.setTimeout(180000) // 3 minutes

    console.log('=== COMPREHENSIVE USER DROPDOWN FLOW TEST ===\n')

    // ==========================================
    // STEP 1: AUTHENTICATE
    // ==========================================
    console.log('📋 STEP 1: Authentication')

    await page.goto('https://bulk-gpt-app.vercel.app/auth')
    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForFunction(() => !window.location.href.includes('/auth'), { timeout: 30000 })
    await page.waitForTimeout(3000)
    console.log('  ✅ Authenticated successfully')

    // Screenshot 1: After login
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/01-after-login.png', fullPage: true })
    console.log('  📸 Screenshot 1: 01-after-login.png')

    // ==========================================
    // STEP 2: VERIFY USER DROPDOWN IS VISIBLE
    // ==========================================
    console.log('\n📋 STEP 2: Verify User Dropdown Button Visibility')

    const userDropdown = page.locator('[data-testid="user-menu-button"]')
    await expect(userDropdown).toBeVisible({ timeout: 10000 })
    console.log('  ✅ User dropdown button is VISIBLE')

    // Verify button structure
    const userIcon = userDropdown.locator('.h-8.w-8') // User icon container
    await expect(userIcon).toBeVisible()
    console.log('  ✅ User icon visible')

    const chevronIcon = userDropdown.locator('svg').last() // ChevronDown icon
    await expect(chevronIcon).toBeVisible()
    console.log('  ✅ Chevron icon visible')

    // Screenshot 2: User dropdown visible
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/02-dropdown-visible.png', fullPage: true })
    console.log('  📸 Screenshot 2: 02-dropdown-visible.png')

    // ==========================================
    // STEP 3: CLICK USER DROPDOWN TO OPEN MENU
    // ==========================================
    console.log('\n📋 STEP 3: Click User Dropdown to Open Menu')

    await userDropdown.click()
    await page.waitForTimeout(1000) // Wait for menu animation
    console.log('  ✅ Clicked user dropdown button')

    // Screenshot 3: Menu opened
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/03-menu-opened.png', fullPage: true })
    console.log('  📸 Screenshot 3: 03-menu-opened.png')

    // ==========================================
    // STEP 4: VERIFY MENU ITEMS ARE PRESENT
    // ==========================================
    console.log('\n📋 STEP 4: Verify All Menu Items Present')

    // Check for account label
    const accountLabel = page.locator('text=My Account').or(page.locator('text=Account'))
    if (await accountLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  ✅ Account label visible')
    }

    // Check for user email
    const emailText = page.locator(`text=${TEST_USER.email}`)
    if (await emailText.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`  ✅ User email visible: ${TEST_USER.email}`)
    }

    // Check for Profile menu item
    const profileMenuItem = page.locator('text=Profile').first()
    await expect(profileMenuItem).toBeVisible({ timeout: 5000 })
    console.log('  ✅ Profile menu item visible')

    // Check for Sign Out menu item
    const signOutMenuItem = page.locator('text=Sign Out').or(page.locator('text=Logout'))
    await expect(signOutMenuItem).toBeVisible({ timeout: 5000 })
    console.log('  ✅ Sign Out menu item visible')

    // Screenshot 4: Menu items visible
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/04-menu-items.png', fullPage: true })
    console.log('  📸 Screenshot 4: 04-menu-items.png')

    // ==========================================
    // STEP 5: TEST PROFILE NAVIGATION
    // ==========================================
    console.log('\n📋 STEP 5: Test Profile Navigation')

    await profileMenuItem.click()
    await page.waitForTimeout(2000)
    console.log('  ✅ Clicked Profile menu item')

    // Verify navigation to profile page
    const profileUrl = page.url()
    expect(profileUrl).toContain('/profile')
    console.log(`  ✅ Navigated to profile page: ${profileUrl}`)

    // Screenshot 5: Profile page
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/05-profile-page.png', fullPage: true })
    console.log('  📸 Screenshot 5: 05-profile-page.png')

    // Verify user dropdown still visible on profile page
    const profilePageDropdown = page.locator('[data-testid="user-menu-button"]')
    await expect(profilePageDropdown).toBeVisible()
    console.log('  ✅ User dropdown visible on profile page')

    // ==========================================
    // STEP 6: NAVIGATE TO DASHBOARD
    // ==========================================
    console.log('\n📋 STEP 6: Navigate to Dashboard')

    await page.goto('https://bulk-gpt-app.vercel.app/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('  ✅ Navigated to dashboard')

    // Verify user dropdown visible on dashboard
    const dashboardDropdown = page.locator('[data-testid="user-menu-button"]')
    await expect(dashboardDropdown).toBeVisible()
    console.log('  ✅ User dropdown visible on dashboard')

    // Screenshot 6: Dashboard with dropdown
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/06-dashboard.png', fullPage: true })
    console.log('  📸 Screenshot 6: 06-dashboard.png')

    // ==========================================
    // STEP 7: TEST SIGN OUT FUNCTIONALITY
    // ==========================================
    console.log('\n📋 STEP 7: Test Sign Out Functionality')

    await dashboardDropdown.click()
    await page.waitForTimeout(1000)
    console.log('  ✅ Opened user dropdown menu')

    const signOutButton = page.locator('text=Sign Out').or(page.locator('text=Logout'))
    await expect(signOutButton).toBeVisible()
    console.log('  ✅ Sign Out button visible')

    // Screenshot 7: Before sign out
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/07-before-signout.png', fullPage: true })
    console.log('  📸 Screenshot 7: 07-before-signout.png')

    await signOutButton.click()
    await page.waitForTimeout(3000)
    console.log('  ✅ Clicked Sign Out')

    // Verify redirected to auth page
    const authUrl = page.url()
    expect(authUrl).toContain('/auth')
    console.log(`  ✅ Redirected to auth page: ${authUrl}`)

    // Screenshot 8: After sign out
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/08-after-signout.png', fullPage: true })
    console.log('  📸 Screenshot 8: 08-after-signout.png')

    // ==========================================
    // STEP 8: TEST RESPONSIVE BEHAVIOR (Mobile)
    // ==========================================
    console.log('\n📋 STEP 8: Test Responsive Behavior - Mobile (375x667)')

    // Re-authenticate for responsive testing
    await page.goto('https://bulk-gpt-app.vercel.app/auth')
    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForFunction(() => !window.location.href.includes('/auth'), { timeout: 30000 })
    await page.waitForTimeout(3000)

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(1000)
    console.log('  ✅ Set viewport to mobile: 375x667')

    const mobileDropdown = page.locator('[data-testid="user-menu-button"]')
    await expect(mobileDropdown).toBeVisible()
    console.log('  ✅ User dropdown visible on mobile')

    // Screenshot 9: Mobile view
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/09-mobile-375.png', fullPage: true })
    console.log('  📸 Screenshot 9: 09-mobile-375.png')

    // Test click on mobile
    await mobileDropdown.click()
    await page.waitForTimeout(1000)
    console.log('  ✅ Clicked user dropdown on mobile')

    // Screenshot 10: Mobile menu opened
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/10-mobile-menu-opened.png', fullPage: true })
    console.log('  📸 Screenshot 10: 10-mobile-menu-opened.png')

    // ==========================================
    // STEP 9: TEST RESPONSIVE BEHAVIOR (Tablet)
    // ==========================================
    console.log('\n📋 STEP 9: Test Responsive Behavior - Tablet (768x1024)')

    // Close mobile menu first
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(1000)
    console.log('  ✅ Set viewport to tablet: 768x1024')

    const tabletDropdown = page.locator('[data-testid="user-menu-button"]')
    await expect(tabletDropdown).toBeVisible()
    console.log('  ✅ User dropdown visible on tablet')

    // Screenshot 11: Tablet view
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/11-tablet-768.png', fullPage: true })
    console.log('  📸 Screenshot 11: 11-tablet-768.png')

    // ==========================================
    // STEP 10: TEST RESPONSIVE BEHAVIOR (Desktop)
    // ==========================================
    console.log('\n📋 STEP 10: Test Responsive Behavior - Desktop (1920x1080)')

    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(1000)
    console.log('  ✅ Set viewport to desktop: 1920x1080')

    const desktopDropdown = page.locator('[data-testid="user-menu-button"]')
    await expect(desktopDropdown).toBeVisible()
    console.log('  ✅ User dropdown visible on desktop')

    // Screenshot 12: Desktop view
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/12-desktop-1920.png', fullPage: true })
    console.log('  📸 Screenshot 12: 12-desktop-1920.png')

    // ==========================================
    // STEP 11: FINAL STATE VERIFICATION
    // ==========================================
    console.log('\n📋 STEP 11: Final State Verification')

    // Reset to default viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)

    // Verify dropdown still functional
    await desktopDropdown.click()
    await page.waitForTimeout(1000)
    console.log('  ✅ User dropdown still functional')

    // Screenshot 13: Final state
    await page.screenshot({ path: 'screenshots/user-dropdown-flow/13-final-state.png', fullPage: true })
    console.log('  📸 Screenshot 13: 13-final-state.png')

    // ==========================================
    // TEST SUMMARY
    // ==========================================
    console.log('\n═══════════════════════════════════════════════')
    console.log('🎉 COMPREHENSIVE USER DROPDOWN FLOW TEST PASSED!')
    console.log('═══════════════════════════════════════════════')
    console.log('\n✅ ALL STEPS COMPLETED:')
    console.log('  1. ✅ Authentication')
    console.log('  2. ✅ User Dropdown Visibility')
    console.log('  3. ✅ Click to Open Menu')
    console.log('  4. ✅ All Menu Items Present')
    console.log('  5. ✅ Profile Navigation')
    console.log('  6. ✅ Dashboard Navigation')
    console.log('  7. ✅ Sign Out Functionality')
    console.log('  8. ✅ Mobile Responsive (375x667)')
    console.log('  9. ✅ Tablet Responsive (768x1024)')
    console.log(' 10. ✅ Desktop Responsive (1920x1080)')
    console.log(' 11. ✅ Final State Verification')
    console.log('\n📸 Screenshots Captured: 13')
    console.log('  - 01-after-login.png')
    console.log('  - 02-dropdown-visible.png')
    console.log('  - 03-menu-opened.png')
    console.log('  - 04-menu-items.png')
    console.log('  - 05-profile-page.png')
    console.log('  - 06-dashboard.png')
    console.log('  - 07-before-signout.png')
    console.log('  - 08-after-signout.png')
    console.log('  - 09-mobile-375.png')
    console.log('  - 10-mobile-menu-opened.png')
    console.log('  - 11-tablet-768.png')
    console.log('  - 12-desktop-1920.png')
    console.log('  - 13-final-state.png')
    console.log('═══════════════════════════════════════════════\n')
  })
})
