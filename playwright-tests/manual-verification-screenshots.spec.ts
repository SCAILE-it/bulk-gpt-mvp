/**
 * Manual verification screenshots
 * Captures current state of deployed app for manual verification
 */

import { test } from '@playwright/test'

const URL = 'https://bulk-gpt-app.vercel.app'

test.describe('Manual verification screenshots', () => {
  test('01 - Auth page (unauthenticated state)', async ({ page }) => {
    await page.goto(URL)
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: 'test-reports/verification/01-auth-page.png',
      fullPage: true
    })
  })

  test('02 - Login and bulk processor page', async ({ page }) => {
    // Login
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    // Wait for redirect
    try {
      await page.waitForURL('**/bulk', { timeout: 15000 })
    } catch (e) {
      console.log('Login failed or slow, capturing anyway...')
    }

    await page.waitForTimeout(2000)

    // Full page screenshot
    await page.screenshot({
      path: 'test-reports/verification/02-bulk-page-full.png',
      fullPage: true
    })

    // Viewport screenshot (above the fold)
    await page.screenshot({
      path: 'test-reports/verification/02-bulk-page-viewport.png',
      fullPage: false
    })
  })

  test('03 - Navigation header close-up', async ({ page }) => {
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/bulk', { timeout: 15000 })
    } catch (e) {
      console.log('Continuing anyway...')
    }

    await page.waitForTimeout(1000)

    // Clip just the header
    await page.screenshot({
      path: 'test-reports/verification/03-nav-header.png',
      clip: { x: 0, y: 0, width: 1920, height: 100 }
    })
  })

  test('04 - Dashboard page', async ({ page }) => {
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/bulk', { timeout: 15000 })
    } catch (e) {}

    await page.waitForTimeout(1000)

    // Navigate to dashboard
    await page.goto(`${URL}/dashboard`)
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: 'test-reports/verification/04-dashboard-page.png',
      fullPage: true
    })
  })

  test('05 - Bulk page with CSV uploaded', async ({ page }) => {
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/bulk', { timeout: 15000 })
    } catch (e) {}

    await page.waitForTimeout(2000)

    // Try to upload a CSV
    const csvContent = 'name,email,company\nJohn Doe,john@acme.com,Acme Corp\nJane Smith,jane@techco.com,TechCo Inc\nBob Johnson,bob@startup.io,Startup.io'
    const buffer = Buffer.from(csvContent)

    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-data.csv',
        mimeType: 'text/csv',
        buffer: buffer
      })

      await page.waitForTimeout(2000)

      await page.screenshot({
        path: 'test-reports/verification/05-bulk-with-csv.png',
        fullPage: true
      })
    } catch (e) {
      console.log('Could not upload CSV, taking screenshot anyway')
      await page.screenshot({
        path: 'test-reports/verification/05-bulk-upload-failed.png',
        fullPage: true
      })
    }
  })

  test('06 - Multiple viewport sizes', async ({ page }) => {
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/bulk', { timeout: 15000 })
    } catch (e) {}

    await page.waitForTimeout(1000)

    // Desktop 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({
      path: 'test-reports/verification/06-viewport-1920x1080.png',
      fullPage: true
    })

    // Laptop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.screenshot({
      path: 'test-reports/verification/06-viewport-1440x900.png',
      fullPage: true
    })

    // Laptop 1280x800
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.screenshot({
      path: 'test-reports/verification/06-viewport-1280x800.png',
      fullPage: true
    })

    // Small laptop 1024x768
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.screenshot({
      path: 'test-reports/verification/06-viewport-1024x768.png',
      fullPage: true
    })
  })

  test('07 - Element measurements', async ({ page, browser }) => {
    await page.goto(`${URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/bulk', { timeout: 15000 })
    } catch (e) {}

    await page.waitForTimeout(2000)

    // Measure key elements
    const measurements = await page.evaluate(() => {
      const results: any = {}

      // Beta banner
      const banner = document.querySelector('[data-testid="beta-banner"]') ||
        document.querySelector('div:has-text("Beta")') ||
        Array.from(document.querySelectorAll('div')).find(el =>
          el.textContent?.toLowerCase().includes('beta')
        )
      if (banner) {
        const rect = banner.getBoundingClientRect()
        results.betaBanner = {
          exists: true,
          height: rect.height,
          width: rect.width
        }
      } else {
        results.betaBanner = { exists: false }
      }

      // Prompt textarea
      const textarea = document.querySelector('textarea')
      if (textarea) {
        const computedStyle = window.getComputedStyle(textarea)
        results.promptTextarea = {
          exists: true,
          minHeight: computedStyle.minHeight,
          height: textarea.getBoundingClientRect().height,
          rows: textarea.rows
        }
      } else {
        results.promptTextarea = { exists: false }
      }

      // Left sidebar
      const leftSidebar = document.querySelector('[class*="left"]') ||
        document.querySelector('.w-1\\/2') ||
        document.querySelector('main > div:first-child')
      if (leftSidebar) {
        const rect = leftSidebar.getBoundingClientRect()
        results.leftSidebar = {
          exists: true,
          height: rect.height,
          viewportHeight: window.innerHeight,
          fillsScreen: rect.height >= window.innerHeight - 100 // Allow 100px for header
        }
      } else {
        results.leftSidebar = { exists: false }
      }

      // Font sizes
      const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      results.fontSizes = {
        headers: headers.slice(0, 10).map(h => ({
          tag: h.tagName,
          fontSize: window.getComputedStyle(h).fontSize,
          text: h.textContent?.substring(0, 30)
        })),
        body: window.getComputedStyle(document.body).fontSize
      }

      return results
    })

    console.log('=== ELEMENT MEASUREMENTS ===')
    console.log(JSON.stringify(measurements, null, 2))

    // Save to file
    const fs = require('fs')
    fs.writeFileSync(
      'test-reports/verification/measurements.json',
      JSON.stringify(measurements, null, 2)
    )
  })
})
