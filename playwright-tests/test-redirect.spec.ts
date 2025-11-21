import { test, expect } from '@playwright/test'

test.describe('Home Page Redirect', () => {
  test('should redirect from root to auth or bulk page', async ({ page }) => {
    // Navigate to root page
    await page.goto('http://localhost:3000')
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle')
    
    // Check if redirected to /auth or /bulk
    const url = page.url()
    expect(url).toMatch(/\/(auth|bulk)/)
    
    // Check console for any errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Wait a bit to catch any errors
    await page.waitForTimeout(2000)
    
    // Log the final URL
    console.log('Final URL:', url)
    console.log('Console errors:', errors)
  })
})

















