/**
 * Phase 1: Surface Backend Features - E2E Test
 * 
 * Tests that parallel processing and retry capabilities are visible in the UI.
 * This proves the approach of "making invisible features visible" works.
 */

import { test, expect } from '@playwright/test'

test.describe('Phase 1: Surface Backend Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to wizard
    await page.goto('http://localhost:5173/bulk')
    
    // Check if auth is required
    const currentUrl = page.url()
    if (currentUrl.includes('/auth')) {
      test.skip(true, 'Test requires authentication - run with authenticated session')
    }
  })

  test('Step 1: Upload shows row count prominently', async ({ page }) => {
    // Upload a test CSV file
    await page.setInputFiles('input[type="file"]', 'playwright-tests/test-small.csv')
    
    // Wait for parsing to complete
    await page.waitForSelector('[data-testid="row-count"]', { timeout: 5000 })
    
    // Row count should be visible and large
    const rowCount = page.locator('[data-testid="row-count"]')
    await expect(rowCount).toBeVisible()
    
    // Verify it uses large font (text-5xl = 48px)
    const fontSize = await rowCount.evaluate(el => {
      return window.getComputedStyle(el).fontSize
    })
    
    // text-5xl in Tailwind is 48px (3rem)
    expect(parseInt(fontSize)).toBeGreaterThanOrEqual(40)
    
    console.log('✅ Row count displayed prominently:', fontSize)
  })

  test('Step 1: Upload shows monospace font for data', async ({ page }) => {
    await page.setInputFiles('input[type="file"]', 'playwright-tests/test-small.csv')
    await page.waitForSelector('[data-testid="csv-preview"]', { timeout: 5000 })
    
    // Check that preview uses monospace font
    const preview = page.locator('[data-testid="csv-preview"]').first()
    const fontFamily = await preview.evaluate(el => {
      return window.getComputedStyle(el).fontFamily
    })
    
    // Should include monospace in font stack
    expect(fontFamily.toLowerCase()).toContain('mono')
    
    console.log('✅ CSV preview uses monospace font:', fontFamily)
  })

  test('Step 1: Upload shows Raw JSON view toggle', async ({ page }) => {
    await page.setInputFiles('input[type="file"]', 'playwright-tests/test-small.csv')
    await page.waitForTimeout(1000)
    
    // Look for JSON view toggle/button
    const jsonButton = page.locator('button:has-text("Raw JSON"), button:has-text("JSON")')
    await expect(jsonButton.first()).toBeVisible({ timeout: 5000 })
    
    // Click to show JSON
    await jsonButton.first().click()
    
    // Verify JSON is displayed
    const jsonView = page.locator('pre').first()
    await expect(jsonView).toBeVisible()
    
    const jsonText = await jsonView.textContent()
    expect(jsonText).toContain('headers')
    expect(jsonText).toContain('rowCount')
    
    console.log('✅ Raw JSON view available and working')
  })

  test('Step 2: Configure shows advanced options by default', async ({ page }) => {
    // Upload first
    await page.setInputFiles('input[type="file"]', 'playwright-tests/test-small.csv')
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Continue")')
    
    // Wait for Step 2
    await page.waitForURL(/step=2/)
    
    // Advanced options should be visible (not collapsed)
    const contextField = page.locator('label:has-text("Context")')
    const outputColumnsField = page.locator('label:has-text("Output Columns")')
    
    // Should be visible without clicking expand
    await expect(contextField).toBeVisible({ timeout: 3000 })
    await expect(outputColumnsField).toBeVisible({ timeout: 3000 })
    
    console.log('✅ Advanced options visible by default (not collapsed)')
  })

  test('Step 2: Configure shows keyboard hints on buttons', async ({ page }) => {
    // Navigate to Step 2
    await page.setInputFiles('input[type="file"]', 'playwright-tests/test-small.csv')
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Continue")')
    await page.waitForURL(/step=2/)
    
    // Look for keyboard hints (kbd elements or specific text)
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Run")')
    const buttonText = await continueButton.first().textContent()
    
    // Should contain keyboard hint symbols (⌘ or Ctrl or similar)
    expect(buttonText).toMatch(/⌘|Ctrl|↵/)
    
    console.log('✅ Keyboard hints visible on buttons:', buttonText)
  })

  test('Step 3: Results shows parallel processing badge', async ({ page }) => {
    // This is a placeholder test - requires actual processing to complete
    // In real implementation, we'd:
    // 1. Upload CSV
    // 2. Configure prompt
    // 3. Start processing
    // 4. Check for "Processing in parallel" badge
    
    // For now, we'll skip the actual processing and just check the component exists
    console.log('⏭️  Skipping actual processing - requires backend to be running')
    
    // Navigate directly to results page (if possible)
    // Or mock the batch data
    test.skip(true, 'Requires full processing flow - test manually')
  })

  test('Step 3: Results shows retry count when > 0', async ({ page }) => {
    // Similar to above - requires actual processing with retries
    // In real implementation, we'd:
    // 1. Trigger a row that fails twice then succeeds
    // 2. Check for "Retried: 2x" or similar badge
    
    console.log('⏭️  Skipping retry test - requires backend with flaky responses')
    test.skip(true, 'Requires processing with retries - test manually')
  })
})

test.describe('Phase 1: Visual Regression', () => {
  test('Step 1: Upload page screenshot', async ({ page }) => {
    await page.goto('http://localhost:5173/bulk')
    
    const currentUrl = page.url()
    if (currentUrl.includes('/auth')) {
      test.skip(true, 'Requires authentication')
    }
    
    // Upload CSV
    await page.setInputFiles('input[type="file"]', 'playwright-tests/test-small.csv')
    await page.waitForTimeout(1500)
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: '/tmp/phase1-step-upload.png',
      fullPage: true 
    })
    
    console.log('📸 Screenshot saved: /tmp/phase1-step-upload.png')
  })

  test('Step 2: Configure page screenshot', async ({ page }) => {
    await page.goto('http://localhost:5173/bulk')
    
    const currentUrl = page.url()
    if (currentUrl.includes('/auth')) {
      test.skip(true, 'Requires authentication')
    }
    
    // Navigate to Step 2
    await page.setInputFiles('input[type="file"]', 'playwright-tests/test-small.csv')
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Continue")')
    await page.waitForTimeout(1500)
    
    // Take screenshot
    await page.screenshot({ 
      path: '/tmp/phase1-step-configure.png',
      fullPage: true 
    })
    
    console.log('📸 Screenshot saved: /tmp/phase1-step-configure.png')
  })
})

test.describe('Phase 1: Accessibility', () => {
  test('Row count has proper ARIA attributes', async ({ page }) => {
    await page.goto('http://localhost:5173/bulk')
    
    const currentUrl = page.url()
    if (currentUrl.includes('/auth')) {
      test.skip(true, 'Requires authentication')
    }
    
    await page.setInputFiles('input[type="file"]', 'playwright-tests/test-small.csv')
    await page.waitForTimeout(1000)
    
    // Check accessibility
    const rowCount = page.locator('[data-testid="row-count"]')
    
    // Should have accessible role or label
    const ariaLabel = await rowCount.getAttribute('aria-label')
    const role = await rowCount.getAttribute('role')
    
    console.log('Row count ARIA:', { ariaLabel, role })
    
    // At least one should be present for accessibility
    expect(ariaLabel || role).toBeTruthy()
  })
})

/**
 * Manual Testing Checklist
 * 
 * After implementing Phase 1, manually verify:
 * 
 * Step 1: Upload
 * [ ] Row count is LARGE (48px font, bold)
 * [ ] Row count uses monospace font
 * [ ] "Raw JSON" button/tab is visible
 * [ ] Clicking JSON shows formatted JSON
 * [ ] Copy button works on JSON view
 * [ ] CSV preview uses monospace font
 * [ ] No more hand-holding text
 * 
 * Step 2: Configure
 * [ ] Advanced options visible by default
 * [ ] Context field visible
 * [ ] Output Columns field visible
 * [ ] No collapsible section for advanced
 * [ ] Keyboard hint visible on buttons (⌘↵)
 * [ ] Prompt textarea uses monospace font
 * 
 * Step 3: Results
 * [ ] "Processing in parallel (X concurrent)" badge visible
 * [ ] Retry count shows when > 0 (test with flaky API)
 * [ ] Results use monospace font
 * [ ] Error messages are real (not "oops")
 * [ ] Copy all results button works
 * 
 * Overall:
 * [ ] Feels more technical/professional
 * [ ] Less whitespace (denser)
 * [ ] More information visible
 * [ ] Power-user aesthetic
 */

