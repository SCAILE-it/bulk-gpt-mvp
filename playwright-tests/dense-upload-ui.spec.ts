/**
 * Dense Upload UI Test
 *
 * Verifies that the upload screen has a power-user aesthetic:
 * - Left-aligned (not centered)
 * - Compact (not huge whitespace)
 * - Keyboard shortcuts visible
 * - No hand-holding text
 */

import { test, expect } from '@playwright/test'

test.describe('Dense Upload UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3334/wizard')

    // Check if auth is required
    const currentUrl = page.url()
    if (currentUrl.includes('/auth')) {
      test.skip(true, 'Test requires authentication - run with authenticated session')
    }
  })

  test('upload screen is left-aligned and compact', async ({ page }) => {
    const dropzone = page.locator('[data-testid="upload-dropzone"]')

    // Wait for dropzone to be visible
    await dropzone.waitFor({ state: 'visible', timeout: 5000 })

    // Get bounding box
    const box = await dropzone.boundingBox()

    expect(box).not.toBeNull()

    if (box) {
      // Should be left-aligned (not centered)
      // On a typical screen, centered would be > 400px from left
      expect(box.x).toBeLessThan(400)

      // Should be compact (not full-width)
      // Full-width would be > 800px wide
      expect(box.width).toBeLessThan(800)

      console.log(`✅ Dropzone position: x=${box.x}, width=${box.width}`)
    }
  })

  test('keyboard shortcuts are visible', async ({ page }) => {
    // Look for keyboard hint on Browse button
    // Should show ⌘O or Ctrl+O
    const kbdHint = page.locator('kbd:has-text("⌘O"), kbd:has-text("Ctrl+O")')

    await expect(kbdHint.first()).toBeVisible({ timeout: 5000 })

    console.log('✅ Keyboard shortcuts visible')
  })

  test('no hand-holding text', async ({ page }) => {
    // Should NOT have beginner-friendly text like "Drop file or browse"
    // Should have technical text like "Drop CSV"

    // Wait for page to load
    await page.waitForTimeout(1000)

    // Check for hand-holding phrases
    const handHoldingText = page.locator('text=/Drop file or browse/i')

    // This should NOT be visible
    await expect(handHoldingText).not.toBeVisible()

    console.log('✅ No hand-holding text found')
  })

  test('uses monospace font for technical elements', async ({ page }) => {
    // Heading should use monospace font
    const heading = page.locator('h2').first()

    await heading.waitFor({ state: 'visible', timeout: 5000 })

    const fontFamily = await heading.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily
    })

    // Should include monospace in font stack
    expect(fontFamily.toLowerCase()).toContain('mono')

    console.log('✅ Monospace font applied:', fontFamily)
  })

  test('compact spacing and padding', async ({ page }) => {
    const dropzone = page.locator('[data-testid="upload-dropzone"]')

    await dropzone.waitFor({ state: 'visible', timeout: 5000 })

    // Check padding is reduced (not p-16 = 64px)
    const padding = await dropzone.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        top: parseInt(styles.paddingTop),
        bottom: parseInt(styles.paddingBottom),
      }
    })

    // Should have reduced padding (p-6 = 24px, not p-16 = 64px)
    expect(padding.top).toBeLessThan(40)
    expect(padding.bottom).toBeLessThan(40)

    console.log('✅ Compact padding:', padding)
  })
})

test.describe('Dense Upload UI - Visual Regression', () => {
  test('upload screen screenshot', async ({ page }) => {
    await page.goto('http://localhost:3334/wizard')

    const currentUrl = page.url()
    if (currentUrl.includes('/auth')) {
      test.skip(true, 'Requires authentication')
    }

    // Wait for page to stabilize
    await page.waitForTimeout(1000)

    // Take screenshot
    await page.screenshot({
      path: '/tmp/dense-upload-ui.png',
      fullPage: true
    })

    console.log('📸 Screenshot saved: /tmp/dense-upload-ui.png')
  })
})
