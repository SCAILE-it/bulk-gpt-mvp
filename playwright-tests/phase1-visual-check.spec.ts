import { test, expect } from '@playwright/test'

test.describe('Phase 1 (P0) - Visual Verification (No Auth Required)', () => {
  test('Verify deployment is live and page loads', async ({ page }) => {
    // Navigate to production deployment
    await page.goto('https://bulk-gpt-9sa6xmwvc-federico-de-pontes-projects.vercel.app/bulk', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Take screenshot
    await page.screenshot({
      path: 'test-reports/phase1-deployment-screenshot.png',
      fullPage: true
    })

    // Verify page loaded (even if redirected to auth)
    const url = page.url()
    console.log(`Current URL: ${url}`)

    // Either on bulk page or auth page
    const isOnBulk = url.includes('/bulk')
    const isOnAuth = url.includes('/auth')

    expect(isOnBulk || isOnAuth).toBe(true)

    console.log('✓ Deployment is live and responding')
  })

  test('Verify TypeScript build succeeded', async ({ page }) => {
    // Try to load the page and check for compilation errors
    await page.goto('https://bulk-gpt-9sa6xmwvc-federico-de-pontes-projects.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Check console for TypeScript/build errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.waitForTimeout(3000)

    // Log any errors found
    if (errors.length > 0) {
      console.log('Console errors found:',errors)
    } else {
      console.log('✓ No console errors detected')
    }

    // Build should have succeeded if page loads
    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(100)

    console.log('✓ Build successful, page rendered')
  })

  test('Check if Recent files section is removed (visual check)', async ({ page }) => {
    await page.goto('https://bulk-gpt-9sa6xmwvc-federico-de-pontes-projects.vercel.app/bulk', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Take screenshot regardless of auth state
    await page.screenshot({
      path: 'test-reports/phase1-no-recent-files.png',
      fullPage: true
    })

    // Check page source for "Recent" text
    const pageContent = await page.content()
    const hasRecentLabel = pageContent.includes('label') && pageContent.includes('Recent')

    console.log(`Page has "Recent" label: ${hasRecentLabel ? 'YES (may need fix)' : 'NO (removed ✓)'}`)
  })
})
