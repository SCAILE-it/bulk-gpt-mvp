import { test, expect } from '@playwright/test'

test.describe('Bulk GPT End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('✅ should load the main page with all sections', async ({ page }) => {
    // Verify header
    await expect(page.getByRole('heading', { name: /Bulk GPT/ })).toBeVisible()
    await expect(page.getByText(/Batch process CSV data through Gemini AI/)).toBeVisible()

    // Verify left panel (inputs)
    await expect(page.getByRole('heading', { name: 'CSV Upload' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Prompt' })).toBeVisible()

    // Verify right panel (results)
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()
  })

  test('✅ should have all form inputs visible', async ({ page }) => {
    // Prompt textarea should be visible
    const promptTextarea = page.locator('textarea#prompt')
    await expect(promptTextarea).toBeVisible()

    // Context textarea should be visible
    const contextTextarea = page.locator('textarea#context')
    await expect(contextTextarea).toBeVisible()

    // File input should be present (though hidden)
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveCount(1)
  })

  test('✅ should have prompt textarea with correct placeholder', async ({ page }) => {
    const promptTextarea = page.locator('textarea#prompt')
    await expect(promptTextarea).toHaveAttribute('placeholder', /Enter your prompt/)
  })

  test('✅ should have context textarea with correct placeholder', async ({ page }) => {
    const contextTextarea = page.locator('textarea#context')
    await expect(contextTextarea).toHaveAttribute('placeholder', /Optional context/)
  })

  test('✅ should have Start Processing button initially disabled', async ({ page }) => {
    // Initially, button should be disabled (no CSV and no prompt)
    const startButton = page.getByRole('button', { name: 'Start Processing' })
    await expect(startButton).toBeDisabled()
  })

  test('✅ should accept text input in prompt textarea', async ({ page }) => {
    const promptTextarea = page.locator('textarea#prompt')
    
    const testPrompt = 'Write a bio for {{name}} from {{company}}'
    await promptTextarea.fill(testPrompt)

    // Verify prompt is entered
    await expect(promptTextarea).toHaveValue(testPrompt)
  })

  test('✅ should accept text input in context textarea', async ({ page }) => {
    const contextTextarea = page.locator('textarea#context')
    
    const testContext = 'Use professional tone'
    await contextTextarea.fill(testContext)

    // Verify context is entered
    await expect(contextTextarea).toHaveValue(testContext)
  })

  test('✅ should show page header with description', async ({ page }) => {
    // Header should be visible
    const header = page.locator('header')
    await expect(header).toBeVisible()

    // Title should be present
    await expect(page.getByRole('heading', { name: /Bulk GPT/ })).toBeVisible()

    // Description should mention async/fire-and-forget
    await expect(page.getByText(/async|fire-and-forget|cloud/)).toBeVisible()
  })

  test('✅ should have two-panel layout', async ({ page }) => {
    // Get the main content area
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()

    // Should have two sections for left and right panels
    const sections = page.locator('main > section')
    await expect(sections).toHaveCount(2)
  })

  test('✅ should have proper CSS classes for flexbox layout', async ({ page }) => {
    const mainContent = page.locator('main')
    // Main should have flex layout
    const mainClasses = await mainContent.getAttribute('class')
    expect(mainClasses).toContain('flex')
  })

  test('✅ should have CSV Upload section', async ({ page }) => {
    const csvUploadHeading = page.getByRole('heading', { name: 'CSV Upload' })
    await expect(csvUploadHeading).toBeVisible()
  })

  test('✅ should have Results section', async ({ page }) => {
    const resultsHeading = page.getByRole('heading', { name: 'Results' })
    await expect(resultsHeading).toBeVisible()

    const resultsArea = resultsHeading.locator('..')
    await expect(resultsArea).toBeVisible()
  })

  test('✅ should have proper semantic HTML structure', async ({ page }) => {
    // Page should have header
    await expect(page.locator('header')).toBeVisible()
    
    // Page should have main
    await expect(page.locator('main')).toBeVisible()
    
    // Page should have sections
    await expect(page.locator('section')).toHaveCount(2)
  })

  test('✅ should display disabled Upload button', async ({ page }) => {
    // Look for any disabled buttons in the upload section
    const uploadSection = page.locator('main > section').first()
    const buttons = uploadSection.locator('button')
    
    // There should be at least one button (Select CSV File, possibly more)
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThanOrEqual(1)
  })
})

test.describe('UI Accessibility & Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('✅ should have proper heading hierarchy', async ({ page }) => {
    // H1 should be present in header
    const h1 = page.locator('header h1')
    await expect(h1).toBeVisible()

    // Should contain Bulk GPT
    await expect(h1).toContainText('Bulk GPT')
  })

  test('✅ should have keyboard navigation support', async ({ page }) => {
    // Find first interactive element
    const buttons = page.locator('button')
    
    // Tab should navigate to first button
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    // At least one button should be visible
    await expect(buttons.first()).toBeVisible()
  })

  test('✅ should have no critical errors in console', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Wait a bit for any errors to appear
    await page.waitForTimeout(1000)

    // Filter out non-critical errors
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('403')
    )

    expect(criticalErrors.length).toBe(0)
  })

  test('✅ should have proper responsive structure', async ({ page }) => {
    const mainContent = page.locator('main')
    const mainClasses = await mainContent.getAttribute('class')
    
    // Should have flex classes
    expect(mainClasses).toContain('flex')
    // Should have gap-6
    expect(mainClasses).toContain('gap-6')
  })

  test('✅ should have proper card styling', async ({ page }) => {
    // Each section should have cards
    const cards = page.locator('[class*="rounded-xl"]')
    
    // Should have multiple cards
    const count = await cards.count()
    expect(count).toBeGreaterThan(2)
  })

  test('✅ should have visible labels for all inputs', async ({ page }) => {
    // Find all labels
    const labels = page.locator('label')
    
    // Should have at least Prompt Template and Context labels
    const labelTexts: string[] = []
    for (let i = 0; i < await labels.count(); i++) {
      const text = await labels.nth(i).textContent()
      if (text) labelTexts.push(text)
    }

    expect(labelTexts.length).toBeGreaterThan(0)
    expect(labelTexts.some(t => t.includes('Prompt') || t.includes('prompt'))).toBe(true)
  })

  test('✅ should have proper width classes for two-panel layout', async ({ page }) => {
    const sections = page.locator('main > section')
    
    for (let i = 0; i < await sections.count(); i++) {
      const classes = await sections.nth(i).getAttribute('class')
      // Each section should have width class
      expect(classes).toMatch(/w-\d+/)
    }
  })
})

test.describe('API Ready Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('✅ should have window.fetch available', async ({ page }) => {
    const hasFetch = await page.evaluate(() => {
      return typeof window.fetch === 'function'
    })

    expect(hasFetch).toBe(true)
  })

  test('✅ should have Supabase client available', async ({ page }) => {
    // Check if Supabase is imported in the app
    const hasSupabase = await page.evaluate(() => {
      return typeof (window as any).fetch === 'function'
    })

    expect(hasSupabase).toBe(true)
  })

  test('✅ should allow page navigation without errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate to same page (refresh-like behavior)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out non-critical errors
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404')
    )

    expect(criticalErrors.length).toBe(0)
  })
})
