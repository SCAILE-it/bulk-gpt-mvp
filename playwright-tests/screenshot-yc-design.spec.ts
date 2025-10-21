import { test, expect } from '@playwright/test'

test.describe('YC-Grade Design Screenshots', () => {
  test('capture UI state for design review', async ({ page }) => {
    // Go to auth page
    await page.goto('http://localhost:3000/auth')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: '/tmp/yc-design-auth.png', fullPage: false })
    console.log('✓ Screenshot: Auth page')

    // Try to access bulk processor directly (may redirect to auth)
    await page.goto('http://localhost:3000/bulk')
    await page.waitForTimeout(2000)
    
    // Check if we're on bulk page or redirected
    const currentUrl = page.url()
    console.log('Current URL:', currentUrl)
    
    if (currentUrl.includes('/bulk')) {
      // We're on the bulk page - take detailed screenshots
      await page.screenshot({ path: '/tmp/yc-design-bulk-full.png', fullPage: true })
      console.log('✓ Screenshot: Bulk processor (full page)')
      
      // Header only
      await page.locator('header').screenshot({ path: '/tmp/yc-design-header.png' })
      console.log('✓ Screenshot: Header with keyboard shortcuts')
      
      // Left sidebar
      await page.locator('main > div').first().screenshot({ path: '/tmp/yc-design-sidebar.png' })
      console.log('✓ Screenshot: Left sidebar configuration panel')
      
      // Check for file input
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.count() > 0) {
        const dropzone = page.locator('[class*="dropzone"], [class*="drag"]').first()
        if (await dropzone.count() > 0) {
          await dropzone.screenshot({ path: '/tmp/yc-design-dropzone.png' })
          console.log('✓ Screenshot: Dropzone component')
        }
      }
      
      // Try to capture an input field with focus
      const promptInput = page.locator('textarea').first()
      if (await promptInput.count() > 0) {
        await promptInput.click()
        await page.waitForTimeout(500)
        await promptInput.screenshot({ path: '/tmp/yc-design-input-focus.png' })
        console.log('✓ Screenshot: Input with focus ring')
      }
      
      // Empty state
      const emptyState = page.locator('[class*="empty"], [class*="justify-center"]').last()
      if (await emptyState.count() > 0) {
        await emptyState.screenshot({ path: '/tmp/yc-design-empty-state.png' })
        console.log('✓ Screenshot: Empty state')
      }
      
    } else {
      console.log('! Redirected to auth - bulk page requires authentication')
      await page.screenshot({ path: '/tmp/yc-design-needs-auth.png', fullPage: false })
    }
  })
})







