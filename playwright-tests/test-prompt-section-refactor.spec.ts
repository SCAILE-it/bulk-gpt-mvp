import { test, expect } from '@playwright/test'

test.describe('PromptSection Component Refactor Verification', () => {
  test('should render PromptSection component with all features', async ({ page }) => {
    // Navigate to the bulk processing page
    await page.goto('http://localhost:3334/bulk')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Verify the prompt section is visible
    const promptLabel = page.locator('label', { hasText: 'Prompt' })
    await expect(promptLabel).toBeVisible()

    // Verify "Browse Templates" button is present
    const browseTemplatesButton = page.locator('button', { hasText: 'Browse Templates' })
    await expect(browseTemplatesButton).toBeVisible()

    // Verify the textarea is present
    const promptTextarea = page.locator('textarea#prompt')
    await expect(promptTextarea).toBeVisible()
    await expect(promptTextarea).toHaveAttribute('placeholder', 'Write a bio for {{name}} at {{company}}')

    // Test typing in the prompt textarea
    await promptTextarea.fill('Test prompt for {{name}}')
    await expect(promptTextarea).toHaveValue('Test prompt for {{name}}')

    // Verify character count appears
    const characterCount = page.locator('text=/\\d+ characters/')
    await expect(characterCount).toBeVisible()

    // Verify character count shows correct number
    await expect(page.locator('text=/24 characters/')).toBeVisible()

    console.log('✅ PromptSection component renders correctly')
  })

  test('should show CSV variable hints when CSV is uploaded', async ({ page }) => {
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    // Create a test CSV file
    const csvContent = 'name,company\nJohn Doe,Acme Inc\nJane Smith,Tech Corp'

    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })

    // Wait for CSV to be processed
    await page.waitForTimeout(1000)

    // Verify variable hints appear
    const variableHints = page.locator('text=/Variables:.*{{name}}.*{{company}}/')
    await expect(variableHints).toBeVisible({ timeout: 10000 })

    console.log('✅ CSV variable hints display correctly')
  })

  test('should show character count validation colors', async ({ page }) => {
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    const promptTextarea = page.locator('textarea#prompt')

    // Test empty state (gray)
    await expect(promptTextarea).toHaveValue('')
    const emptyCount = page.locator('p:has-text("0 characters")')
    await expect(emptyCount).toHaveClass(/text-zinc-600/)

    // Test short prompt (orange - too short)
    await promptTextarea.fill('Hi')
    await page.waitForTimeout(300)
    const shortCount = page.locator('p:has-text("2 characters")')
    await expect(shortCount).toHaveClass(/text-orange-500/)
    await expect(page.locator('text=/(too short)/')).toBeVisible()

    // Test normal prompt (default color)
    await promptTextarea.fill('Write a bio for {{name}} at {{company}}')
    await page.waitForTimeout(300)
    const normalCount = page.locator('text=/43 characters/')
    await expect(normalCount).toHaveClass(/text-zinc-400/)

    console.log('✅ Character count validation works correctly')
  })

  test('should open template gallery when Browse Templates is clicked', async ({ page }) => {
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    // Click Browse Templates button
    const browseTemplatesButton = page.locator('button', { hasText: 'Browse Templates' })
    await browseTemplatesButton.click()

    // Wait for template gallery modal to appear
    await page.waitForTimeout(500)

    // Verify template gallery is visible (modal should open)
    // Note: This tests the callback works correctly
    const modalTitle = page.locator('h2, h3').filter({ hasText: /template/i })
    await expect(modalTitle).toBeVisible({ timeout: 3000 })

    console.log('✅ Browse Templates button opens gallery correctly')
  })

  test('should maintain functionality after refactor', async ({ page }) => {
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV
    const csvContent = 'name,email\nAlice,alice@example.com\nBob,bob@example.com'
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'contacts.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })

    await page.waitForTimeout(1000)

    // Enter a prompt
    const promptTextarea = page.locator('textarea#prompt')
    await promptTextarea.fill('Generate a welcome email for {{name}} at {{email}}')

    // Verify the prompt is stored correctly
    await expect(promptTextarea).toHaveValue('Generate a welcome email for {{name}} at {{email}}')

    // Verify variable hints show both variables
    const variableHints = page.locator('text=/Variables:.*{{name}}.*{{email}}/')
    await expect(variableHints).toBeVisible()

    // Take a screenshot for verification
    await page.screenshot({
      path: 'test-reports/prompt-section-refactor-verification.png',
      fullPage: true
    })

    console.log('✅ All PromptSection functionality works correctly after refactor')
  })
})
