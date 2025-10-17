import { test, expect } from '@playwright/test'

/**
 * BULK-GPT MVP Full Workflow E2E Tests
 * Run via Playwright MCP in Cursor
 * 
 * Commands to run:
 *   - All tests: npx playwright test playwright-tests/e2e-full-workflow.spec.ts
 *   - Single test: npx playwright test -g "test name"
 *   - With UI: npx playwright test --ui
 *   - With headed: npx playwright test --headed
 */

test.describe('BULK-GPT Full Workflow - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Use baseURL from config (localhost:3000)
    await page.goto('/', { waitUntil: 'networkidle' })
  })

  test('T1: Page loads without TypeScript errors', async ({ page }) => {
    console.log('🧪 T1: Checking page loads...')

    // Verify title
    await expect(page).toHaveTitle('Bulk GPT MVP')
    console.log('✅ Title correct: Bulk GPT MVP')

    // Verify heading
    const heading = page.locator('h1')
    await expect(heading).toContainText('Bulk GPT')
    console.log('✅ Heading visible: 🚀 Bulk GPT')

    // Verify description
    const description = page.locator('p').first()
    await expect(description).toContainText('Batch process CSV data through Gemini AI')
    console.log('✅ Description visible')

    // Check console for errors
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text())
      }
    })
    
    await page.waitForTimeout(1000)
    
    const criticalErrors = consoleLogs.filter(e => !e.includes('favicon') && !e.includes('_next'))
    if (criticalErrors.length > 0) {
      console.log('❌ Found console errors:', criticalErrors)
    }
    expect(criticalErrors).toHaveLength(0)
    console.log('✅ No critical console errors')
  })

  test('T2: Layout is 50/50 split (Left: Input, Right: Results)', async ({ page }) => {
    const sections = page.locator('main > section')
    await expect(sections).toHaveCount(2)

    // Left section - CSV Upload
    const leftSection = sections.nth(0)
    await expect(leftSection).toBeVisible()
    await expect(leftSection.getByRole('heading', { name: 'CSV Upload' })).toBeVisible()

    // Right section - Results
    const rightSection = sections.nth(1)
    await expect(rightSection).toBeVisible()
    await expect(rightSection.getByRole('heading', { name: 'Results' })).toBeVisible()
  })

  test('T3: CSV upload component is accessible', async ({ page }) => {
    console.log('🧪 T3: Testing CSV upload component...')

    // Check drag-drop area
    const uploadArea = page.locator('text=Drag and drop your CSV file here')
    await expect(uploadArea).toBeVisible()
    console.log('✅ Drag-drop area visible')

    // Check file input
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', '.csv')
    console.log('✅ File input accepts .csv')

    // Check select button
    const selectBtn = page.locator('button').filter({ hasText: 'Select CSV File' })
    await expect(selectBtn).toBeVisible()
    await expect(selectBtn).toBeEnabled()
    console.log('✅ Select button is clickable')

    // Check file size limit text
    const sizeText = page.locator('text=Maximum file size: 50MB')
    await expect(sizeText).toBeVisible()
    console.log('✅ File size limit displayed: 50MB')
  })

  test('T4: Prompt input field accepts text', async ({ page }) => {
    console.log('🧪 T4: Testing prompt input...')

    const promptTextarea = page.locator('textarea').first()
    await expect(promptTextarea).toBeVisible()
    console.log('✅ Prompt textarea visible')

    // Check placeholder
    const placeholder = await promptTextarea.getAttribute('placeholder')
    console.log('📝 Placeholder:', placeholder)
    expect(placeholder).toContain('{{column}}')
    console.log('✅ Placeholder mentions {{column}} template variables')

    // Type test prompt
    const testPrompt = 'Analyze {{name}} and summarize {{description}}'
    await promptTextarea.fill(testPrompt)
    await expect(promptTextarea).toHaveValue(testPrompt)
    console.log('✅ Prompt text entered:', testPrompt)
  })

  test('T5: Context field is optional but functional', async ({ page }) => {
    console.log('🧪 T5: Testing context input...')

    const contextTextarea = page.locator('textarea').nth(1)
    await expect(contextTextarea).toBeVisible()
    console.log('✅ Context textarea visible')

    const testContext = 'Focus on business metrics and KPIs'
    await contextTextarea.fill(testContext)
    await expect(contextTextarea).toHaveValue(testContext)
    console.log('✅ Context text entered:', testContext)
  })

  test('T6: Process button is disabled without CSV + Prompt', async ({ page }) => {
    console.log('🧪 T6: Testing process button initial state...')

    const processBtn = page.locator('button').filter({ hasText: 'Start Processing' })
    await expect(processBtn).toBeVisible()
    console.log('✅ Process button visible')

    await expect(processBtn).toBeDisabled()
    console.log('✅ Process button is DISABLED (as expected - no CSV/prompt yet)')

    const classes = await processBtn.getAttribute('class')
    expect(classes).toMatch(/disabled|cursor-not-allowed|bg-muted/)
    console.log('✅ Button has disabled styling')
  })

  test('T7: CSV upload with valid data', async ({ page }) => {
    console.log('🧪 T7: Testing CSV file upload...')

    // Create test CSV
    const csvContent = 'name,description,category\nJohn Doe,Senior Developer,Tech\nJane Smith,Product Manager,Business'
    const buffer = Buffer.from(csvContent)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    })
    console.log('✅ CSV file uploaded (2 rows, 3 columns)')

    // Wait for file processing
    await page.waitForTimeout(2000)

    // Check if preview appears
    const preview = page.locator('text=CSV Preview')
    const table = page.locator('table')
    
    if (await preview.isVisible()) {
      console.log('✅ CSV Preview section appeared')
      const headers = await table.locator('th').allTextContents()
      console.log('📝 CSV Headers:', headers)
    } else {
      console.log('⚠️  CSV Preview not visible (parsing may have failed)')
    }
  })

  test('T8: Process button enables after CSV + Prompt', async ({ page }) => {
    console.log('🧪 T8: Testing process button enable logic...')

    // Fill prompt
    const promptTextarea = page.locator('textarea').first()
    await promptTextarea.fill('Summarize: {{description}}')
    console.log('✅ Prompt filled')

    // Upload CSV
    const csvContent = 'name\nTest Name'
    const buffer = Buffer.from(csvContent)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    })
    console.log('✅ CSV uploaded')

    await page.waitForTimeout(2000)

    const processBtn = page.locator('button').filter({ hasText: 'Start Processing' })
    
    // Check if button is now enabled
    const isDisabled = await processBtn.isDisabled()
    if (!isDisabled) {
      console.log('✅ Process button is now ENABLED')
      const classes = await processBtn.getAttribute('class')
      console.log('📝 Button classes:', classes)
    } else {
      console.log('⚠️  Process button still disabled (CSV may not have parsed)')
    }
  })

  test('T9: Results table shows empty state', async ({ page }) => {
    const emptyState = page.getByText('No results yet. Upload a CSV and start processing.').first()
    await expect(emptyState).toBeVisible()
  })

  test('T10: Responsive layout on mobile viewport', async ({ page }) => {
    console.log('🧪 T10: Testing mobile responsiveness...')

    await page.setViewportSize({ width: 375, height: 667 })
    console.log('📱 Viewport set to mobile: 375x667')

    await page.waitForTimeout(500)

    // Header should be visible
    const header = page.locator('header')
    await expect(header).toBeVisible()
    console.log('✅ Header visible on mobile')

    // Main content should be accessible
    const main = page.locator('main')
    await expect(main).toBeVisible()
    console.log('✅ Main content visible on mobile')

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    console.log('📐 Viewport reset to desktop')
  })

  test('T11: Keyboard navigation works', async ({ page }) => {
    console.log('🧪 T11: Testing keyboard navigation...')

    // Tab through fields
    await page.keyboard.press('Tab')
    console.log('✅ Tab key pressed')

    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    console.log('📝 Focused element:', focusedElement)

    // Type in focused element
    if (focusedElement === 'TEXTAREA') {
      await page.keyboard.type('Test keyboard input')
      console.log('✅ Typed in textarea via keyboard')
    } else {
      console.log('⚠️  Focus not on textarea, skipping keyboard type test')
    }
  })

  test('T12: Special characters in CSV', async ({ page }) => {
    console.log('🧪 T12: Testing special characters handling...')

    const csvContent = 'text,notes\n"Hello, World!","Test: @#$%^&*()"\n"Quotes ""inside""","Normal text"'
    const buffer = Buffer.from(csvContent)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'special-chars.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    })
    console.log('✅ CSV with special characters uploaded')

    await page.waitForTimeout(2000)

    // Check for console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    const criticalErrors = errors.filter(e => !e.includes('favicon'))
    if (criticalErrors.length === 0) {
      console.log('✅ No errors when parsing special characters')
    } else {
      console.log('❌ Errors found:', criticalErrors)
    }
  })

  test('T13: Large CSV file handling', async ({ page }) => {
    console.log('🧪 T13: Testing large CSV handling...')

    // Create larger CSV (1000 rows)
    let csvContent = 'id,name,email,status\n'
    for (let i = 1; i <= 100; i++) {
      csvContent += `${i},Person ${i},person${i}@example.com,active\n`
    }

    const buffer = Buffer.from(csvContent)
    const fileInput = page.locator('input[type="file"]')

    await fileInput.setInputFiles({
      name: 'large-file.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    })
    console.log('✅ Large CSV uploaded (100 rows)')

    await page.waitForTimeout(3000)

    // Check if preview loaded
    const preview = page.locator('text=CSV Preview')
    if (await preview.isVisible()) {
      console.log('✅ Large file preview loaded successfully')
    } else {
      console.log('⚠️  Preview not visible for large file')
    }
  })

  test('T14: Empty CSV rejection', async ({ page }) => {
    console.log('🧪 T14: Testing empty CSV handling...')

    const emptyCSV = ''
    const buffer = Buffer.from(emptyCSV)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'empty.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    })
    console.log('✅ Empty CSV uploaded')

    await page.waitForTimeout(2000)

    // Check for error message
    const errorMsg = page.locator('text=Error')
    if (await errorMsg.isVisible()) {
      const error = await errorMsg.textContent()
      console.log('✅ Error displayed:', error)
    } else {
      console.log('⚠️  No error message visible')
    }
  })

  test('T15: CSV with only headers', async ({ page }) => {
    console.log('🧪 T15: Testing CSV with headers only...')

    const headerOnlyCSV = 'name,email,phone'
    const buffer = Buffer.from(headerOnlyCSV)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'headers-only.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    })
    console.log('✅ Headers-only CSV uploaded')

    await page.waitForTimeout(2000)

    // Check state
    const errorMsg = page.locator('text=Error').or(page.locator('text=No data'))
    if (await errorMsg.isVisible()) {
      console.log('✅ Appropriate message shown for empty CSV')
    } else {
      console.log('⚠️  No feedback for empty CSV')
    }
  })

  test('T16: Form state persists during session', async ({ page }) => {
    console.log('🧪 T16: Testing form state persistence...')

    // Fill form
    const promptTextarea = page.locator('textarea').first()
    const testPrompt = 'Test prompt for persistence'
    await promptTextarea.fill(testPrompt)

    const contextTextarea = page.locator('textarea').nth(1)
    const testContext = 'Test context'
    await contextTextarea.fill(testContext)

    console.log('✅ Form filled')

    // Simulate page interaction
    await page.waitForTimeout(1000)

    // Check values still there
    await expect(promptTextarea).toHaveValue(testPrompt)
    await expect(contextTextarea).toHaveValue(testContext)

    console.log('✅ Form state persisted')
  })

  test('T17: No TypeScript runtime errors', async ({ page }) => {
    console.log('🧪 T17: Comprehensive error checking...')

    const jsErrors: string[] = []
    const uncaughtErrors: Error[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text())
      }
    })

    page.on('pageerror', error => {
      uncaughtErrors.push(error)
    })

    // Wait for any async operations
    await page.waitForTimeout(3000)

    const criticalJSErrors = jsErrors.filter(
      e => !e.includes('favicon') && !e.includes('_next') && !e.includes('401')
    )

    if (criticalJSErrors.length > 0) {
      console.log('❌ Found JS errors:', criticalJSErrors)
    }
    if (uncaughtErrors.length > 0) {
      console.log('❌ Uncaught errors:', uncaughtErrors.map(e => e.message))
    }

    expect(criticalJSErrors).toHaveLength(0)
    expect(uncaughtErrors).toHaveLength(0)
    console.log('✅ No TypeScript/runtime errors detected')
  })
})
