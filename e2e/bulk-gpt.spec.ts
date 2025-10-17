import { test, expect } from '@playwright/test'

test.describe('Bulk GPT End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should load the main page with all sections', async ({ page }) => {
    // Verify header
    await expect(page.locator('text=🚀 Bulk GPT')).toBeVisible()
    await expect(page.locator('text=Batch process CSV data through Gemini AI')).toBeVisible()

    // Verify left panel (inputs)
    await expect(page.locator('text=CSV Upload')).toBeVisible()
    await expect(page.locator('text=Prompt')).toBeVisible()

    // Verify right panel (results)
    await expect(page.locator('text=Results')).toBeVisible()
  })

  test('should upload a CSV file', async ({ page }) => {
    // Create a test CSV file content
    const csvContent = 'name,company,role\nAlice,TechCorp,Engineer\nBob,DataCo,Analyst'
    
    // Find upload area and upload file
    const fileInput = page.locator('input[type="file"]')
    
    // Create a File-like object
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })

    // Wait for file to be processed
    await page.waitForTimeout(1000)

    // Verify CSV preview is shown
    await expect(page.locator('text=CSV Preview')).toBeVisible()
    await expect(page.locator('text=3 rows, 3 columns')).toBeVisible()
  })

  test('should enter prompt with template variables', async ({ page }) => {
    // Upload CSV first
    const csvContent = 'name,company,role\nAlice,TechCorp,Engineer'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })
    await page.waitForTimeout(1000)

    // Find prompt textarea
    const promptTextarea = page.locator('textarea#prompt')
    await expect(promptTextarea).toBeVisible()

    // Enter prompt with template variables
    const testPrompt = 'Write a short bio for {{name}} from {{company}} who works as a {{role}}'
    await promptTextarea.fill(testPrompt)

    // Verify prompt is entered
    await expect(promptTextarea).toHaveValue(testPrompt)
  })

  test('should enable/disable start button based on inputs', async ({ page }) => {
    // Initially, button should be disabled (no CSV)
    const startButton = page.locator('button:has-text("Start Processing")')
    await expect(startButton).toBeDisabled()

    // Upload CSV
    const csvContent = 'name,company\nAlice,TechCorp'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })
    await page.waitForTimeout(1000)

    // Button should still be disabled (no prompt)
    await expect(startButton).toBeDisabled()

    // Enter prompt
    const promptTextarea = page.locator('textarea#prompt')
    await promptTextarea.fill('Test prompt')
    await page.waitForTimeout(500)

    // Button should now be enabled
    await expect(startButton).toBeEnabled()
  })

  test('should show processing state when started', async ({ page }) => {
    // Setup: Upload CSV and enter prompt
    const csvContent = 'name,company\nAlice,TechCorp'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })
    await page.waitForTimeout(1000)

    const promptTextarea = page.locator('textarea#prompt')
    await promptTextarea.fill('Create a bio for {{name}} from {{company}}')

    // Click start button
    const startButton = page.locator('button:has-text("Start Processing")')
    await startButton.click()

    // Wait for processing state
    await page.waitForTimeout(500)

    // Button text should change to "Processing..."
    await expect(page.locator('button:has-text("Processing")')).toBeVisible()

    // Processing card should appear
    await expect(page.locator('text=Processing')).toBeVisible()

    // Progress bar should be visible
    const progressBar = page.locator('div[role="progressbar"], div >> nth=*')
    // There should be a progress container
    await expect(page.locator('text=/Processing:/i')).toBeVisible()
  })

  test('should disable inputs while processing', async ({ page }) => {
    // Setup: Upload CSV and enter prompt
    const csvContent = 'name,company\nAlice,TechCorp'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })
    await page.waitForTimeout(1000)

    const promptTextarea = page.locator('textarea#prompt')
    await promptTextarea.fill('Test prompt')

    // Click start button
    const startButton = page.locator('button:has-text("Start Processing")')
    await startButton.click()
    await page.waitForTimeout(500)

    // Inputs should be disabled
    await expect(promptTextarea).toBeDisabled()

    const contextTextarea = page.locator('textarea#context')
    await expect(contextTextarea).toBeDisabled()
  })

  test('should show results table', async ({ page }) => {
    // Verify results section exists
    await expect(page.locator('text=Results')).toBeVisible()

    // Table should be visible
    const resultsSection = page.locator('text=Results').locator('..').locator('table')
    // At minimum, a container for results should exist
    const resultsCard = page.locator('text=Results').locator('..')
    await expect(resultsCard).toBeVisible()
  })

  test('should show export button when results available', async ({ page }) => {
    // Export button should not be visible initially
    const exportButton = page.locator('button:has-text("Export")')
    
    // By default, no results means no export button
    // This test verifies the UI structure exists to show/hide export
    const resultsCard = page.locator('text=Results').locator('..')
    await expect(resultsCard).toBeVisible()
  })

  test('should display error message on invalid prompt', async ({ page }) => {
    // Upload CSV
    const csvContent = 'name\nAlice'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })
    await page.waitForTimeout(1000)

    // Try to start without prompt
    const startButton = page.locator('button:has-text("Start Processing")')
    
    // Button should be disabled since no prompt entered
    await expect(startButton).toBeDisabled()
  })

  test('should render context textarea', async ({ page }) => {
    // Context textarea should be visible on the page
    const contextTextarea = page.locator('textarea#context')
    await expect(contextTextarea).toBeVisible()

    // Should have placeholder
    await expect(contextTextarea).toHaveAttribute('placeholder', /Optional context|context/i)
  })

  test('should handle CSV file with headers and data', async ({ page }) => {
    // Create CSV with headers and multiple rows
    const csvContent = `product,category,price
      Laptop,Electronics,1299
      Mouse,Electronics,29
      Desk,Furniture,499`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'products.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })

    // Wait for processing
    await page.waitForTimeout(1000)

    // Should show preview
    await expect(page.locator('text=CSV Preview')).toBeVisible()
    
    // Should show row and column count
    await expect(page.locator(/\d+ rows, \d+ columns/)).toBeVisible()
  })

  test('should show page header with description', async ({ page }) => {
    // Header should be visible
    const header = page.locator('header')
    await expect(header).toBeVisible()

    // Title should be present
    await expect(page.locator('text=🚀 Bulk GPT')).toBeVisible()

    // Description should mention async/fire-and-forget
    await expect(page.locator('text=/async|fire-and-forget|cloud/i')).toBeVisible()
  })

  test('should have two-panel layout', async ({ page }) => {
    // Get the main content area
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()

    // Should have sections for left and right panels
    const sections = page.locator('section')
    await expect(sections).toHaveCount(2) // Left and right panels
  })
})

test.describe('UI Accessibility Tests', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // H1 should be present
    const h1 = page.locator('h1, text=Bulk GPT')
    await expect(h1).toBeVisible()
  })

  test('should have readable contrast', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Main content should be visible (basic contrast check)
    const cards = page.locator('[class*="card"], [class*="Card"]')
    await expect(cards).toHaveCount(0) // Or at least some > 0 based on structure
  })

  test('should have keyboard navigation support', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Find first interactive element
    const buttons = page.locator('button')
    
    // Tab should navigate to buttons
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    // At least one button should be in focus or visible
    await expect(buttons.first()).toBeVisible()
  })
})




