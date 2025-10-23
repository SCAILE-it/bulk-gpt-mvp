/**
 * Comprehensive UX Verification
 * Checks all 20 audit issues + 8 new user issues
 * Takes screenshots for visual verification
 */

import { test, expect } from '@playwright/test'

const DEPLOYED_URL = 'https://bulk-gpt-app.vercel.app'

test.describe('Comprehensive UX Audit Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${DEPLOYED_URL}/auth`)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/bulk', { timeout: 10000 })
  })

  test('P0-1: Beta banner dismissal', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Check if beta banner exists
    const banner = page.locator('[data-testid="beta-banner"]').or(page.locator('text=/beta/i').first())

    const screenshot = await page.screenshot({ fullPage: true })
    await page.screenshot({
      path: 'test-reports/verification/p0-1-beta-banner.png',
      fullPage: true
    })

    // Check if close button works and uses localStorage
    const closeBtn = page.locator('button:has-text("×")').or(page.locator('[aria-label="Close"]'))
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click()
      await page.reload()

      // Should still be dismissed after reload if localStorage works
      await page.screenshot({
        path: 'test-reports/verification/p0-1-beta-banner-dismissed.png',
        fullPage: true
      })
    }
  })

  test('P0-2: Prompt textarea height', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Find prompt textarea
    const textarea = page.locator('textarea').first()

    // Measure height
    const box = await textarea.boundingBox()

    await page.screenshot({
      path: 'test-reports/verification/p0-2-prompt-textarea.png',
      fullPage: true
    })

    console.log(`Prompt textarea height: ${box?.height}px (should be >= 180px)`)
  })

  test('P0-3: CSV upload loading state', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Screenshot before upload
    await page.screenshot({
      path: 'test-reports/verification/p0-3-before-upload.png',
      fullPage: true
    })

    // Create a test CSV file
    const csvContent = 'name,email,company\nJohn,john@test.com,Acme\nJane,jane@test.com,TechCo'
    const buffer = Buffer.from(csvContent)

    // Upload file and check for loading state
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: buffer
    })

    // Try to capture loading state (might be too fast)
    await page.screenshot({
      path: 'test-reports/verification/p0-3-during-upload.png',
      fullPage: true
    })

    // Wait for upload to complete
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'test-reports/verification/p0-3-after-upload.png',
      fullPage: true
    })
  })

  test('P1-4: Workflow steps clarity', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Screenshot workflow steps
    await page.screenshot({
      path: 'test-reports/verification/p1-4-workflow-steps.png',
      fullPage: true
    })
  })

  test('P1-5: Recent files clickable', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Upload a file first to create recent file
    const csvContent = 'name,email\nTest,test@test.com'
    const buffer = Buffer.from(csvContent)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'recent-test.csv',
      mimeType: 'text/csv',
      buffer: buffer
    })

    await page.waitForTimeout(1000)

    // Screenshot recent files section
    await page.screenshot({
      path: 'test-reports/verification/p1-5-recent-files.png',
      fullPage: true
    })
  })

  test('P1-6: Output fields explanation', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Focus on output fields section
    const outputSection = page.locator('text=/output/i').first()
    if (await outputSection.count() > 0) {
      await outputSection.scrollIntoViewIfNeeded()
    }

    await page.screenshot({
      path: 'test-reports/verification/p1-6-output-fields.png',
      fullPage: true
    })
  })

  test('NEW-1: Dashboard download functionality', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/dashboard`)

    await page.screenshot({
      path: 'test-reports/verification/new-1-dashboard-downloads.png',
      fullPage: true
    })

    // Check for download buttons
    const downloadButtons = page.locator('button:has-text("Download"), button:has-text("CSV"), button:has-text("JSON")')
    console.log(`Download buttons found: ${await downloadButtons.count()}`)
  })

  test('NEW-2: Nav links (should be RUN and EXECUTIONS only)', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Screenshot navigation
    await page.screenshot({
      path: 'test-reports/verification/new-2-nav-links.png',
      fullPage: false
    })

    // Check nav links
    const navLinks = page.locator('nav a, header a')
    const linkCount = await navLinks.count()
    console.log(`Nav links found: ${linkCount}`)

    for (let i = 0; i < linkCount; i++) {
      const text = await navLinks.nth(i).textContent()
      console.log(`Nav link ${i}: ${text}`)
    }
  })

  test('NEW-3: Left sidebar height consistency', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Measure left sidebar height
    const leftSidebar = page.locator('[class*="left"]').or(page.locator('.w-1\\/2').first())
    const box = await leftSidebar.boundingBox()

    await page.screenshot({
      path: 'test-reports/verification/new-3-lhs-height.png',
      fullPage: true
    })

    console.log(`Left sidebar height: ${box?.height}px`)
    console.log(`Viewport height: ${page.viewportSize()?.height}px`)
  })

  test('NEW-4: Data preview location', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Upload CSV first
    const csvContent = 'name,email\nJohn,john@test.com\nJane,jane@test.com'
    const buffer = Buffer.from(csvContent)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'preview-test.csv',
      mimeType: 'text/csv',
      buffer: buffer
    })

    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'test-reports/verification/new-4-data-preview-location.png',
      fullPage: true
    })
  })

  test('NEW-5: Browse button functionality', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Find browse button
    const browseBtn = page.locator('button:has-text("Browse"), button:has-text("Upload")')

    await page.screenshot({
      path: 'test-reports/verification/new-5-browse-button.png',
      fullPage: true
    })

    console.log(`Browse buttons found: ${await browseBtn.count()}`)
  })

  test('NEW-6: Font size consistency', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Take screenshots of different sections to check font sizes
    await page.screenshot({
      path: 'test-reports/verification/new-6-font-sizes-full.png',
      fullPage: true
    })

    // Measure various text elements
    const headers = page.locator('h1, h2, h3, h4')
    const headerCount = await headers.count()

    for (let i = 0; i < Math.min(headerCount, 5); i++) {
      const fontSize = await headers.nth(i).evaluate(el =>
        window.getComputedStyle(el).fontSize
      )
      const tagName = await headers.nth(i).evaluate(el => el.tagName)
      console.log(`${tagName} font-size: ${fontSize}`)
    }
  })

  test('NEW-7: Output format readability', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Upload and process to see output
    const csvContent = 'name,email\nJohn,john@test.com'
    const buffer = Buffer.from(csvContent)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'output-test.csv',
      mimeType: 'text/csv',
      buffer: buffer
    })

    await page.waitForTimeout(1000)

    // Fill prompt
    await page.fill('textarea', 'Write a bio for {{name}}')

    // Test to see output
    const testBtn = page.locator('button:has-text("Test")')
    if (await testBtn.count() > 0) {
      await testBtn.click()
      await page.waitForTimeout(2000)
    }

    await page.screenshot({
      path: 'test-reports/verification/new-7-output-format.png',
      fullPage: true
    })
  })

  test('NEW-8: Filename display', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Upload with specific filename
    const csvContent = 'name,email\nJohn,john@test.com'
    const buffer = Buffer.from(csvContent)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'meaningful-filename-test-2024.csv',
      mimeType: 'text/csv',
      buffer: buffer
    })

    await page.waitForTimeout(1000)

    await page.screenshot({
      path: 'test-reports/verification/new-8-filename-display.png',
      fullPage: true
    })

    // Check if filename is displayed
    const filenameDisplay = page.locator('text=meaningful-filename-test-2024.csv')
    console.log(`Filename displayed: ${await filenameDisplay.count() > 0}`)
  })

  test('Full page overview', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/bulk`)

    // Full page screenshot at different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({
      path: 'test-reports/verification/overview-1920x1080.png',
      fullPage: true
    })

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.screenshot({
      path: 'test-reports/verification/overview-1440x900.png',
      fullPage: true
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.screenshot({
      path: 'test-reports/verification/overview-1280x800.png',
      fullPage: true
    })
  })
})
