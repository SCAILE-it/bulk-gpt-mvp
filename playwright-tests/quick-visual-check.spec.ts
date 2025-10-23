/**
 * Quick visual check - no auth required
 * Just captures what's visible to verify deployment
 */

import { test, expect } from '@playwright/test'

const URL = 'https://bulk-gpt-app.vercel.app'

// Disable auth setup for these tests
test.use({ storageState: undefined })

test.describe('Quick visual verification (no auth)', () => {
  test('Auth page is accessible', async ({ page }) => {
    await page.goto(`${URL}/auth`)

    // Take screenshot
    await page.screenshot({
      path: 'test-reports/verification/quick-01-auth-page.png',
      fullPage: true
    })

    // Check for key elements
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()

    console.log('✅ Auth page loaded successfully')
  })

  test('Root redirects to auth', async ({ page }) => {
    const response = await page.goto(URL)

    // Should redirect to /auth
    expect(page.url()).toContain('/auth')

    await page.screenshot({
      path: 'test-reports/verification/quick-02-root-redirect.png',
      fullPage: true
    })

    console.log(`✅ Root redirects to: ${page.url()}`)
  })

  test('Check responsive breakpoints', async ({ page }) => {
    await page.goto(`${URL}/auth`)

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({
      path: 'test-reports/verification/quick-03-desktop-1920.png',
      fullPage: true
    })

    // Laptop
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.screenshot({
      path: 'test-reports/verification/quick-04-laptop-1440.png',
      fullPage: true
    })

    // Tablet
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.screenshot({
      path: 'test-reports/verification/quick-05-tablet-1024.png',
      fullPage: true
    })

    console.log('✅ Captured responsive screenshots')
  })

  test('Measure key elements on auth page', async ({ page }) => {
    await page.goto(`${URL}/auth`)

    const measurements = await page.evaluate(() => {
      const results: any = {}

      // Email input
      const emailInput = document.querySelector('input[type="email"]')
      if (emailInput) {
        const rect = emailInput.getBoundingClientRect()
        results.emailInput = {
          height: rect.height,
          width: rect.width
        }
      }

      // Submit button
      const submitBtn = document.querySelector('button[type="submit"]')
      if (submitBtn) {
        const rect = submitBtn.getBoundingClientRect()
        const computed = window.getComputedStyle(submitBtn)
        results.submitButton = {
          height: rect.height,
          width: rect.width,
          fontSize: computed.fontSize
        }
      }

      // Page title/header
      const headers = document.querySelectorAll('h1, h2')
      results.headers = Array.from(headers).slice(0, 3).map(h => ({
        tag: h.tagName,
        text: h.textContent?.substring(0, 50),
        fontSize: window.getComputedStyle(h).fontSize
      }))

      return results
    })

    console.log('=== AUTH PAGE MEASUREMENTS ===')
    console.log(JSON.stringify(measurements, null, 2))

    // Save to file
    const fs = require('fs')
    fs.writeFileSync(
      'test-reports/verification/auth-page-measurements.json',
      JSON.stringify(measurements, null, 2)
    )
  })
})
