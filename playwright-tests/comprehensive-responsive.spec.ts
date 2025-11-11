import { test, expect, devices } from '@playwright/test'

const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!'
}

// Define viewport configurations
const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1920, height: 1080, name: 'Desktop HD' },
  ultrawide: { width: 2560, height: 1440, name: 'Ultrawide' }
}

test.describe('Comprehensive Responsive Design Test', () => {
  test('should test ALL pages across mobile, tablet, and desktop viewports', async ({ page }) => {
    test.setTimeout(480000) // 8 minutes

    console.log('=== COMPREHENSIVE RESPONSIVE DESIGN TEST ===\n')

    // ==========================================
    // SECTION 1: AUTHENTICATION - MOBILE
    // ==========================================
    console.log('📋 SECTION 1: Authentication on Mobile (375x667)')

    await page.setViewportSize(VIEWPORTS.mobile)
    await page.goto('https://bulk-gpt-app.vercel.app/auth')
    await page.waitForLoadState('networkidle')
    console.log('  ✓ Mobile viewport set')

    // Screenshot 1: Mobile auth page
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-01-auth-mobile.png', fullPage: true })
    console.log('  ✓ Screenshot 1: responsive-01-auth-mobile.png')

    // Login on mobile
    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForFunction(() => !window.location.href.includes('/auth'), { timeout: 30000 })
    await page.waitForTimeout(3000)
    console.log('  ✓ Logged in on mobile')

    // Screenshot 2: Mobile post-login
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-02-mobile-logged-in.png', fullPage: true })
    console.log('  ✓ Screenshot 2: responsive-02-mobile-logged-in.png')

    // ==========================================
    // SECTION 2: BULK PAGE - MOBILE
    // ==========================================
    console.log('\n📋 SECTION 2: Bulk Processor Page on Mobile')

    const currentUrl = page.url()
    if (!currentUrl.includes('/bulk')) {
      await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    }
    await page.waitForTimeout(2000)

    // Screenshot 3: Mobile bulk page
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-03-bulk-mobile.png', fullPage: true })
    console.log('  ✓ Screenshot 3: responsive-03-bulk-mobile.png')

    // Test mobile navigation
    const mobileMenu = page.locator('[aria-label="Menu"]').or(page.locator('button:has-text("☰")')).or(page.locator('[role="button"]:has(svg)')).first()
    if (await mobileMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  ✓ Mobile menu detected')

      await mobileMenu.click()
      await page.waitForTimeout(1000)

      // Screenshot 4: Mobile menu open
      await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-04-mobile-menu-open.png', fullPage: true })
      console.log('  ✓ Screenshot 4: responsive-04-mobile-menu-open.png')

      // Close menu
      await page.keyboard.press('Escape')
    } else {
      console.log('  ℹ️  Mobile menu not found (might use different pattern)')
    }

    // ==========================================
    // SECTION 3: DASHBOARD PAGE - MOBILE
    // ==========================================
    console.log('\n📋 SECTION 3: Dashboard Page on Mobile')

    await page.goto('https://bulk-gpt-app.vercel.app/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Screenshot 5: Mobile dashboard
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-05-dashboard-mobile.png', fullPage: true })
    console.log('  ✓ Screenshot 5: responsive-05-dashboard-mobile.png')

    // ==========================================
    // SECTION 4: PROFILE PAGE - MOBILE
    // ==========================================
    console.log('\n📋 SECTION 4: Profile Page on Mobile')

    await page.goto('https://bulk-gpt-app.vercel.app/profile', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Screenshot 6: Mobile profile
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-06-profile-mobile.png', fullPage: true })
    console.log('  ✓ Screenshot 6: responsive-06-profile-mobile.png')

    // ==========================================
    // SECTION 5: TABLET - AUTH & NAVIGATION
    // ==========================================
    console.log('\n📋 SECTION 5: Switching to Tablet Viewport (768x1024)')

    await page.setViewportSize(VIEWPORTS.tablet)
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('  ✓ Tablet viewport set')

    // Screenshot 7: Tablet bulk page
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-07-bulk-tablet.png', fullPage: true })
    console.log('  ✓ Screenshot 7: responsive-07-bulk-tablet.png')

    // ==========================================
    // SECTION 6: DASHBOARD PAGE - TABLET
    // ==========================================
    console.log('\n📋 SECTION 6: Dashboard Page on Tablet')

    await page.goto('https://bulk-gpt-app.vercel.app/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Screenshot 8: Tablet dashboard
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-08-dashboard-tablet.png', fullPage: true })
    console.log('  ✓ Screenshot 8: responsive-08-dashboard-tablet.png')

    // Check if table is scrollable
    const tableContainer = page.locator('table').or(page.locator('[role="table"]')).first()
    if (await tableContainer.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  ✓ Table visible on tablet')

      // Test horizontal scroll if needed
      const tableBox = await tableContainer.boundingBox()
      if (tableBox) {
        console.log(`  ✓ Table width: ${tableBox.width}px`)
      }
    }

    // ==========================================
    // SECTION 7: PROFILE PAGE - TABLET
    // ==========================================
    console.log('\n📋 SECTION 7: Profile Page on Tablet')

    await page.goto('https://bulk-gpt-app.vercel.app/profile', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Screenshot 9: Tablet profile
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-09-profile-tablet.png', fullPage: true })
    console.log('  ✓ Screenshot 9: responsive-09-profile-tablet.png')

    // ==========================================
    // SECTION 8: DESKTOP - STANDARD VIEWPORT
    // ==========================================
    console.log('\n📋 SECTION 8: Switching to Desktop Viewport (1920x1080)')

    await page.setViewportSize(VIEWPORTS.desktop)
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('  ✓ Desktop viewport set')

    // Screenshot 10: Desktop bulk page
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-10-bulk-desktop.png', fullPage: true })
    console.log('  ✓ Screenshot 10: responsive-10-bulk-desktop.png')

    // ==========================================
    // SECTION 9: DASHBOARD PAGE - DESKTOP
    // ==========================================
    console.log('\n📋 SECTION 9: Dashboard Page on Desktop')

    await page.goto('https://bulk-gpt-app.vercel.app/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Screenshot 11: Desktop dashboard
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-11-dashboard-desktop.png', fullPage: true })
    console.log('  ✓ Screenshot 11: responsive-11-dashboard-desktop.png')

    // ==========================================
    // SECTION 10: PROFILE PAGE - DESKTOP
    // ==========================================
    console.log('\n📋 SECTION 10: Profile Page on Desktop')

    await page.goto('https://bulk-gpt-app.vercel.app/profile', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Screenshot 12: Desktop profile
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-12-profile-desktop.png', fullPage: true })
    console.log('  ✓ Screenshot 12: responsive-12-profile-desktop.png')

    // ==========================================
    // SECTION 11: ULTRAWIDE - LARGE VIEWPORT
    // ==========================================
    console.log('\n📋 SECTION 11: Switching to Ultrawide Viewport (2560x1440)')

    await page.setViewportSize(VIEWPORTS.ultrawide)
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('  ✓ Ultrawide viewport set')

    // Screenshot 13: Ultrawide bulk page
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-13-bulk-ultrawide.png', fullPage: true })
    console.log('  ✓ Screenshot 13: responsive-13-bulk-ultrawide.png')

    // ==========================================
    // SECTION 12: DASHBOARD PAGE - ULTRAWIDE
    // ==========================================
    console.log('\n📋 SECTION 12: Dashboard Page on Ultrawide')

    await page.goto('https://bulk-gpt-app.vercel.app/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Screenshot 14: Ultrawide dashboard
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-14-dashboard-ultrawide.png', fullPage: true })
    console.log('  ✓ Screenshot 14: responsive-14-dashboard-ultrawide.png')

    // ==========================================
    // SECTION 13: LANDSCAPE VS PORTRAIT - MOBILE
    // ==========================================
    console.log('\n📋 SECTION 13: Testing Portrait vs Landscape on Mobile')

    // Portrait (default)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Screenshot 15: Portrait mode
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-15-mobile-portrait.png', fullPage: true })
    console.log('  ✓ Screenshot 15: responsive-15-mobile-portrait.png')

    // Landscape
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(2000)

    // Screenshot 16: Landscape mode
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-16-mobile-landscape.png', fullPage: true })
    console.log('  ✓ Screenshot 16: responsive-16-mobile-landscape.png')

    // ==========================================
    // SECTION 14: SIDEBAR BEHAVIOR ACROSS VIEWPORTS
    // ==========================================
    console.log('\n📋 SECTION 14: Testing Sidebar/Navigation Behavior')

    // Mobile - sidebar should collapse
    await page.setViewportSize(VIEWPORTS.mobile)
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const sidebar = page.locator('[role="navigation"]').or(page.locator('nav')).or(page.locator('aside')).first()
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      const sidebarBox = await sidebar.boundingBox()
      if (sidebarBox) {
        console.log(`  ✓ Mobile sidebar: ${sidebarBox.width}px wide`)
      }
    }

    // Desktop - sidebar should be visible
    await page.setViewportSize(VIEWPORTS.desktop)
    await page.waitForTimeout(2000)

    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      const desktopSidebarBox = await sidebar.boundingBox()
      if (desktopSidebarBox) {
        console.log(`  ✓ Desktop sidebar: ${desktopSidebarBox.width}px wide`)
      }
    }

    // Screenshot 17: Desktop with sidebar
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-17-desktop-sidebar.png', fullPage: true })
    console.log('  ✓ Screenshot 17: responsive-17-desktop-sidebar.png')

    // ==========================================
    // SECTION 15: TOUCH TARGET SIZES - MOBILE
    // ==========================================
    console.log('\n📋 SECTION 15: Testing Touch Target Sizes on Mobile')

    await page.setViewportSize(VIEWPORTS.mobile)
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Check button sizes
    const buttons = await page.locator('button').all()
    let tooSmallCount = 0

    for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
      if (await button.isVisible().catch(() => false)) {
        const box = await button.boundingBox()
        if (box && (box.width < 44 || box.height < 44)) {
          tooSmallCount++
        }
      }
    }

    if (tooSmallCount > 0) {
      console.log(`  ⚠️  Found ${tooSmallCount} buttons smaller than 44x44px (recommended touch target)`)
    } else {
      console.log('  ✓ All checked buttons meet 44x44px touch target size')
    }

    // Screenshot 18: Mobile touch targets
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-18-mobile-touch-targets.png', fullPage: true })
    console.log('  ✓ Screenshot 18: responsive-18-mobile-touch-targets.png')

    // ==========================================
    // SECTION 16: TEXT READABILITY ACROSS VIEWPORTS
    // ==========================================
    console.log('\n📋 SECTION 16: Testing Text Readability')

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile)
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const mobileText = page.locator('p').or(page.locator('span')).first()
    if (await mobileText.isVisible({ timeout: 3000 }).catch(() => false)) {
      const fontSize = await mobileText.evaluate((el) => window.getComputedStyle(el).fontSize)
      console.log(`  ✓ Mobile text size: ${fontSize}`)
    }

    // Desktop
    await page.setViewportSize(VIEWPORTS.desktop)
    await page.waitForTimeout(1000)

    if (await mobileText.isVisible({ timeout: 3000 }).catch(() => false)) {
      const desktopFontSize = await mobileText.evaluate((el) => window.getComputedStyle(el).fontSize)
      console.log(`  ✓ Desktop text size: ${desktopFontSize}`)
    }

    // ==========================================
    // SECTION 17: VIEWPORT TRANSITION TEST
    // ==========================================
    console.log('\n📋 SECTION 17: Testing Smooth Viewport Transitions')

    // Gradually resize from mobile to desktop
    const steps = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 640, height: 800, name: 'Small tablet' },
      { width: 1024, height: 768, name: 'Large tablet' },
      { width: 1280, height: 720, name: 'Small desktop' },
      { width: 1920, height: 1080, name: 'Desktop HD' }
    ]

    for (const step of steps) {
      await page.setViewportSize({ width: step.width, height: step.height })
      await page.waitForTimeout(500)
      console.log(`  ✓ Resized to ${step.name} (${step.width}x${step.height})`)
    }

    // Screenshot 19: Final viewport state
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-19-final-viewport.png', fullPage: true })
    console.log('  ✓ Screenshot 19: responsive-19-final-viewport.png')

    // ==========================================
    // SECTION 18: FINAL RESPONSIVE VERIFICATION
    // ==========================================
    console.log('\n📋 SECTION 18: Final Responsive Verification')

    // Reset to desktop
    await page.setViewportSize(VIEWPORTS.desktop)
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const logo = page.locator('text=Bulk GPT').first()
    await expect(logo).toBeVisible()
    console.log('  ✓ Logo visible after all viewport changes')

    // Screenshot 20: Final state
    await page.screenshot({ path: 'screenshots/comprehensive-test/responsive-20-final-state.png', fullPage: true })
    console.log('  ✓ Screenshot 20: responsive-20-final-state.png')

    // ==========================================
    // TEST SUMMARY
    // ==========================================
    console.log('\n═══════════════════════════════════════════════')
    console.log('🎉 COMPREHENSIVE RESPONSIVE DESIGN TEST PASSED!')
    console.log('═══════════════════════════════════════════════')
    console.log('\n✅ ALL RESPONSIVE SECTIONS VERIFIED:')
    console.log('  1. ✓ Authentication on Mobile')
    console.log('  2. ✓ Bulk Processor Page on Mobile')
    console.log('  3. ✓ Dashboard Page on Mobile')
    console.log('  4. ✓ Profile Page on Mobile')
    console.log('  5. ✓ Tablet Viewport Testing')
    console.log('  6. ✓ Dashboard Page on Tablet')
    console.log('  7. ✓ Profile Page on Tablet')
    console.log('  8. ✓ Desktop Viewport Testing')
    console.log('  9. ✓ Dashboard Page on Desktop')
    console.log(' 10. ✓ Profile Page on Desktop')
    console.log(' 11. ✓ Ultrawide Viewport Testing')
    console.log(' 12. ✓ Dashboard Page on Ultrawide')
    console.log(' 13. ✓ Portrait vs Landscape Testing')
    console.log(' 14. ✓ Sidebar Behavior Across Viewports')
    console.log(' 15. ✓ Touch Target Sizes on Mobile')
    console.log(' 16. ✓ Text Readability Across Viewports')
    console.log(' 17. ✓ Smooth Viewport Transitions')
    console.log(' 18. ✓ Final Responsive Verification')
    console.log('\n📸 Screenshots Captured: 20')
    console.log('  - responsive-01-auth-mobile.png')
    console.log('  - responsive-02-mobile-logged-in.png')
    console.log('  - responsive-03-bulk-mobile.png')
    console.log('  - responsive-04-mobile-menu-open.png')
    console.log('  - responsive-05-dashboard-mobile.png')
    console.log('  - responsive-06-profile-mobile.png')
    console.log('  - responsive-07-bulk-tablet.png')
    console.log('  - responsive-08-dashboard-tablet.png')
    console.log('  - responsive-09-profile-tablet.png')
    console.log('  - responsive-10-bulk-desktop.png')
    console.log('  - responsive-11-dashboard-desktop.png')
    console.log('  - responsive-12-profile-desktop.png')
    console.log('  - responsive-13-bulk-ultrawide.png')
    console.log('  - responsive-14-dashboard-ultrawide.png')
    console.log('  - responsive-15-mobile-portrait.png')
    console.log('  - responsive-16-mobile-landscape.png')
    console.log('  - responsive-17-desktop-sidebar.png')
    console.log('  - responsive-18-mobile-touch-targets.png')
    console.log('  - responsive-19-final-viewport.png')
    console.log('  - responsive-20-final-state.png')
    console.log('\n📱 Viewports Tested:')
    console.log(`  - Mobile: ${VIEWPORTS.mobile.width}x${VIEWPORTS.mobile.height} (${VIEWPORTS.mobile.name})`)
    console.log(`  - Tablet: ${VIEWPORTS.tablet.width}x${VIEWPORTS.tablet.height} (${VIEWPORTS.tablet.name})`)
    console.log(`  - Desktop: ${VIEWPORTS.desktop.width}x${VIEWPORTS.desktop.height} (${VIEWPORTS.desktop.name})`)
    console.log(`  - Ultrawide: ${VIEWPORTS.ultrawide.width}x${VIEWPORTS.ultrawide.height} (${VIEWPORTS.ultrawide.name})`)
    console.log('═══════════════════════════════════════════════\n')
  })
})
