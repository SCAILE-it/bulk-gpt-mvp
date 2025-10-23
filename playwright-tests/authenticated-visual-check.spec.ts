/**
 * Capture authenticated pages - manual login approach
 * This bypasses the auth.setup.ts dependency issue
 */

import { test, expect } from '@playwright/test'

const URL = 'https://bulk-gpt-app.vercel.app'

// Skip auth setup for this test
test.use({ storageState: undefined })

test.describe('Capture authenticated pages', () => {
  test('Login and capture /bulk page', async ({ page }) => {
    // Go to auth page
    await page.goto(`${URL}/auth`)

    // Fill in credentials
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')

    // Click sign in
    await page.click('button[type="submit"]')

    // Wait for navigation to bulk page
    try {
      await page.waitForURL('**/bulk', { timeout: 15000 })
    } catch (e) {
      console.log('Did not navigate to /bulk, trying to navigate manually...')
      await page.goto(`${URL}/bulk`)
    }

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Full page screenshot
    await page.screenshot({
      path: 'test-reports/verification/bulk-page-full.png',
      fullPage: true
    })

    // Viewport screenshot
    await page.screenshot({
      path: 'test-reports/verification/bulk-page-viewport.png',
      fullPage: false
    })

    console.log('✅ Captured /bulk page')
  })

  test('Capture /dashboard page', async ({ page }) => {
    // Login first
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    // Wait and navigate to dashboard
    await page.waitForTimeout(2000)
    await page.goto(`${URL}/dashboard`)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Full page screenshot
    await page.screenshot({
      path: 'test-reports/verification/dashboard-page-full.png',
      fullPage: true
    })

    // Viewport screenshot
    await page.screenshot({
      path: 'test-reports/verification/dashboard-page-viewport.png',
      fullPage: false
    })

    console.log('✅ Captured /dashboard page')
  })

  test('Capture navigation header', async ({ page }) => {
    // Login
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(3000)

    // Capture just the header
    await page.screenshot({
      path: 'test-reports/verification/nav-header-authenticated.png',
      clip: { x: 0, y: 0, width: 1920, height: 100 }
    })

    console.log('✅ Captured navigation header')
  })

  test('Capture /bulk with CSV uploaded', async ({ page }) => {
    // Login
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(3000)
    await page.goto(`${URL}/bulk`)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Try to upload a CSV
    const csvContent = 'name,email,company\nJohn Doe,john@acme.com,Acme Corp\nJane Smith,jane@techco.com,TechCo Inc\nBob Johnson,bob@startup.io,Startup.io'
    const buffer = Buffer.from(csvContent)

    try {
      // Find file input
      const fileInput = page.locator('input[type="file"]')

      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: 'test-data.csv',
          mimeType: 'text/csv',
          buffer: buffer
        })

        await page.waitForTimeout(3000)

        // Screenshot with CSV loaded
        await page.screenshot({
          path: 'test-reports/verification/bulk-with-csv-loaded.png',
          fullPage: true
        })

        console.log('✅ Captured /bulk with CSV loaded')
      } else {
        console.log('⚠️ No file input found')
        await page.screenshot({
          path: 'test-reports/verification/bulk-no-file-input.png',
          fullPage: true
        })
      }
    } catch (e) {
      console.log('Error uploading CSV:', e)
      await page.screenshot({
        path: 'test-reports/verification/bulk-upload-error.png',
        fullPage: true
      })
    }
  })

  test('Measure key elements on /bulk page', async ({ page }) => {
    // Login
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(3000)
    await page.goto(`${URL}/bulk`)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Measure elements
    const measurements = await page.evaluate(() => {
      const results: any = {}

      // Prompt textarea
      const textarea = document.querySelector('textarea')
      if (textarea) {
        const computed = window.getComputedStyle(textarea)
        const rect = textarea.getBoundingClientRect()
        results.promptTextarea = {
          minHeight: computed.minHeight,
          height: rect.height,
          rows: textarea.getAttribute('rows')
        }
      }

      // Left sidebar
      const leftPanel = document.querySelector('[class*="left"]') ||
                        document.querySelector('main > div:first-child')
      if (leftPanel) {
        const rect = leftPanel.getBoundingClientRect()
        results.leftSidebar = {
          height: rect.height,
          viewportHeight: window.innerHeight,
          fillsScreen: Math.abs(rect.height - window.innerHeight) < 100
        }
      }

      // Navigation links
      const navLinks = Array.from(document.querySelectorAll('nav a, header a'))
      results.navLinks = navLinks.slice(0, 5).map(link => ({
        text: link.textContent?.trim(),
        href: (link as HTMLAnchorElement).href
      }))

      // Font sizes
      const allText = document.querySelectorAll('p, span, div, button, input, label')
      const fontSizes = new Set<string>()
      Array.from(allText).slice(0, 50).forEach(el => {
        fontSizes.add(window.getComputedStyle(el).fontSize)
      })
      results.fontSizes = Array.from(fontSizes).sort()

      return results
    })

    console.log('=== BULK PAGE MEASUREMENTS ===')
    console.log(JSON.stringify(measurements, null, 2))

    // Save to file
    const fs = require('fs')
    fs.writeFileSync(
      'test-reports/verification/bulk-page-measurements.json',
      JSON.stringify(measurements, null, 2)
    )
  })
})
