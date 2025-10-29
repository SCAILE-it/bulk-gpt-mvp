import { test, expect } from '@playwright/test'

test.describe('UX Audit - Screenshot Capture', () => {

  test('capture initial state', async ({ page }) => {
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    // Full page screenshot
    await page.screenshot({
      path: 'ux-audit-01-initial.png',
      fullPage: true
    })
  })

  test('capture with CSV uploaded', async ({ page }) => {
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    // Create and upload CSV
    const csvContent = `name,email,company,role
John Doe,john@acme.com,Acme Corp,CEO
Jane Smith,jane@techco.com,TechCo,CTO
Bob Johnson,bob@startup.io,Startup Inc,Founder`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8')
    })

    await page.waitForTimeout(2000)

    // Screenshot with data loaded
    await page.screenshot({
      path: 'ux-audit-02-csv-loaded.png',
      fullPage: true
    })
  })

  test('capture prompt area focus', async ({ page }) => {
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV first
    const csvContent = `name,email,company
John Doe,john@acme.com,Acme Corp`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8')
    })

    await page.waitForTimeout(2000)

    // Find and focus on textarea
    const textarea = page.locator('textarea').first()
    if (await textarea.count() > 0) {
      await textarea.click()
      await page.waitForTimeout(500)
    }

    await page.screenshot({
      path: 'ux-audit-03-prompt-focused.png',
      fullPage: true
    })
  })

  test('capture desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: 'ux-audit-04-desktop-wide.png',
      fullPage: true
    })
  })

  test('capture laptop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: 'ux-audit-05-laptop.png',
      fullPage: true
    })
  })
})
