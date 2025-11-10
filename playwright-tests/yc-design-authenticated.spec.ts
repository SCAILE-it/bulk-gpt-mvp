import { test, expect } from '@playwright/test'

// Use authenticated state
test.use({ storageState: 'playwright/.auth/user.json' })

test.describe('YC-Grade Design Review - Authenticated', () => {
  test('capture bulk processor UI with YC design', async ({ page }) => {
    // Navigate to bulk processor (uses baseURL from playwright.config.ts)
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // Check if we successfully loaded
    const title = await page.locator('h1').textContent()
    console.log('Page title:', title)
    
    // Full page screenshot
    await page.screenshot({ 
      path: '/tmp/yc-bulk-full-authenticated.png', 
      fullPage: true 
    })
    console.log('✓ Full page screenshot saved')
    
    // Header with keyboard shortcuts
    const header = page.locator('header')
    if (await header.count() > 0) {
      await header.screenshot({ path: '/tmp/yc-header.png' })
      console.log('✓ Header screenshot saved')
    }
    
    // Left sidebar (first child of main)
    const sidebar = page.locator('main > div').first()
    if (await sidebar.count() > 0) {
      await sidebar.screenshot({ path: '/tmp/yc-sidebar.png' })
      console.log('✓ Sidebar screenshot saved')
    }
    
    // Dropzone area
    const dropzone = page.locator('[class*="border-dashed"]').first()
    if (await dropzone.count() > 0) {
      await dropzone.screenshot({ path: '/tmp/yc-dropzone.png' })
      console.log('✓ Dropzone screenshot saved')
    }
    
    // Prompt textarea
    const promptArea = page.locator('textarea').first()
    if (await promptArea.count() > 0) {
      // Unfocused state
      await promptArea.screenshot({ path: '/tmp/yc-textarea-unfocused.png' })
      
      // Focused state (to show glow ring)
      await promptArea.click()
      await page.waitForTimeout(300)
      await promptArea.screenshot({ path: '/tmp/yc-textarea-focused.png' })
      console.log('✓ Textarea screenshots saved (focused/unfocused)')
    }
    
    // Buttons
    const buttons = page.locator('button').filter({ hasText: 'Test' })
    if (await buttons.count() > 0) {
      await buttons.first().screenshot({ path: '/tmp/yc-button.png' })
      console.log('✓ Button screenshot saved')
    }
    
    console.log('\n✅ All screenshots captured in /tmp/')
  })
})







