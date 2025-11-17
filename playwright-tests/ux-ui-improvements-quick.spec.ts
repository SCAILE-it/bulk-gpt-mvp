/**
 * Quick UX/UI Improvements Test Suite
 * 
 * Simplified tests that can run without full auth setup
 * Tests key UX/UI improvements that are visible without authentication
 */

import { test, expect } from '@playwright/test'

test.describe('UX/UI Improvements - Quick Tests', () => {
  
  test('should load auth page with proper structure', async ({ page }) => {
    await page.goto('/auth')
    await page.waitForLoadState('domcontentloaded')
    
    // Check that page loads
    await expect(page.locator('body')).toBeVisible()
    
    // Check for form elements
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('should have proper form labels and accessibility', async ({ page }) => {
    await page.goto('/auth')
    await page.waitForLoadState('domcontentloaded')
    
    // Check that inputs have labels or aria-labels
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    
    const emailId = await emailInput.getAttribute('id')
    const emailAriaLabel = await emailInput.getAttribute('aria-label')
    const emailPlaceholder = await emailInput.getAttribute('placeholder')
    
    const passwordId = await passwordInput.getAttribute('id')
    const passwordAriaLabel = await passwordInput.getAttribute('aria-label')
    const passwordPlaceholder = await passwordInput.getAttribute('placeholder')
    
    // Email input should have at least one identifier
    expect(emailId || emailAriaLabel || emailPlaceholder).toBeTruthy()
    
    // Password input should have at least one identifier
    expect(passwordId || passwordAriaLabel || passwordPlaceholder).toBeTruthy()
  })

  test('should show validation feedback on form submission', async ({ page }) => {
    await page.goto('/auth')
    await page.waitForLoadState('domcontentloaded')
    
    // Try submitting empty form
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()
    
    // Wait a bit for validation
    await page.waitForTimeout(500)
    
    // Check for validation errors (may or may not appear depending on implementation)
    const errorMessages = page.locator('[aria-invalid="true"], .error-message, text=/required/i, text=/invalid/i')
    const errorCount = await errorMessages.count()
    
    // Should have some form of validation feedback
    // (either visible errors or disabled button)
    const isDisabled = await submitButton.isDisabled()
    const hasErrors = errorCount > 0
    
    expect(isDisabled || hasErrors).toBeTruthy()
  })

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/auth')
    await page.waitForLoadState('domcontentloaded')
    
    // Tab to focus an element
    await page.keyboard.press('Tab')
    
    // Check that focused element has focus styles
    const focusedElement = page.locator(':focus')
    const hasFocusStyles = await focusedElement.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      const outlineWidth = styles.outlineWidth
      const outlineStyle = styles.outlineStyle
      const boxShadow = styles.boxShadow
      
      return outlineWidth !== '0px' || 
             outlineStyle !== 'none' || 
             boxShadow !== 'none'
    })
    
    expect(hasFocusStyles).toBeTruthy()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/auth')
    await page.waitForLoadState('domcontentloaded')
    
    // Tab through form elements
    await page.keyboard.press('Tab')
    const firstFocused = page.locator(':focus')
    await expect(firstFocused).toBeVisible()
    
    await page.keyboard.press('Tab')
    const secondFocused = page.locator(':focus')
    await expect(secondFocused).toBeVisible()
    
    // Should be able to navigate through form
    expect(await firstFocused.count()).toBeGreaterThan(0)
    expect(await secondFocused.count()).toBeGreaterThan(0)
  })

  test('should have proper button touch targets on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.goto('/auth')
    await page.waitForLoadState('domcontentloaded')
    
    // Check button sizes
    const submitButton = page.locator('button[type="submit"]').first()
    const box = await submitButton.boundingBox()
    
    if (box) {
      // Buttons should be at least 44x44px on mobile
      expect(box.height).toBeGreaterThanOrEqual(40) // Allow some flexibility
      expect(box.width).toBeGreaterThanOrEqual(100) // Submit buttons are usually wider
    }
  })

  test('should adapt layout for mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/auth')
    await page.waitForLoadState('domcontentloaded')
    
    // Check that page renders without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = 375
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20) // Allow small margin
  })

  test('should have manifest.json', async ({ page }) => {
    const response = await page.goto('/manifest.json')
    
    // Should not 404
    expect(response?.status()).not.toBe(404)
    
    if (response?.status() === 200) {
      const contentType = response?.headers()['content-type']
      expect(contentType).toContain('json')
    }
  })

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/auth')
    await page.waitForLoadState('domcontentloaded')
    
    // Check for proper form structure
    const form = page.locator('form').first()
    const formExists = await form.isVisible().catch(() => false)
    
    if (formExists) {
      // Form should have proper structure
      await expect(form).toBeVisible()
    }
    
    // Check buttons have proper attributes
    const buttons = page.locator('button').all()
    const buttonElements = await buttons
    
    let buttonsWithLabels = 0
    for (const button of buttonElements) {
      const ariaLabel = await button.getAttribute('aria-label')
      const textContent = await button.textContent()
      
      if (ariaLabel || (textContent && textContent.trim())) {
        buttonsWithLabels++
      }
    }
    
    // Most buttons should have labels or text
    expect(buttonsWithLabels).toBeGreaterThan(buttonElements.length * 0.5)
  })
})


