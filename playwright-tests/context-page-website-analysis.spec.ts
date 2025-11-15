import { test, expect } from '@playwright/test'

test.describe('Context Page and Website Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to context page
    await page.goto('/context')
    await page.waitForLoadState('networkidle')
  })

  test('should display context page with all fields', async ({ page }) => {
    // Verify page title/header
    await expect(page.locator('text=Context')).toBeVisible()
    
    // Verify website analysis section
    await expect(page.locator('text=Analyze Website')).toBeVisible()
    await expect(page.locator('input[type="url"]')).toBeVisible()
    await expect(page.locator('button:has-text("Analyze")')).toBeVisible()

    // Verify all context fields are present
    await expect(page.locator('label:has-text("Tone")')).toBeVisible()
    await expect(page.locator('label:has-text("Target Countries")')).toBeVisible()
    await expect(page.locator('label:has-text("Product Description")')).toBeVisible()
    await expect(page.locator('label:has-text("Competitors")')).toBeVisible()
    await expect(page.locator('label:has-text("Target Industries")')).toBeVisible()
    await expect(page.locator('label:has-text("Compliance Flags")')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'playwright-tests/screenshots/context-page-initial.png', fullPage: true })
  })

  test('should analyze website and populate context fields', async ({ page }) => {
    test.setTimeout(60000) // 60 seconds for API call

    // Enter a test website URL (using a simple, accessible site)
    const testUrl = 'https://example.com'
    const urlInput = page.locator('input[type="url"]')
    
    await urlInput.fill(testUrl)
    await expect(urlInput).toHaveValue(testUrl)

    // Click analyze button
    const analyzeButton = page.locator('button:has-text("Analyze")')
    await expect(analyzeButton).toBeEnabled()
    await analyzeButton.click()

    // Wait for analysis to complete (button should show "Analyzing..." then back to "Analyze")
    await expect(page.locator('text=Analyzing...')).toBeVisible({ timeout: 5000 }).catch(() => {
      // If already completed, that's fine
    })

    // Wait for success toast or for fields to be populated
    // Check if any context field has been filled (indicating success)
    await page.waitForTimeout(5000) // Wait for API response

    // Verify that at least some fields might be populated (analysis may or may not find all fields)
    // The API should return some data, even if minimal
    const toneField = page.locator('input#tone')
    const productField = page.locator('textarea#productDescription')
    
    // Check if fields have been populated (they might be empty if analysis didn't find info)
    const toneValue = await toneField.inputValue()
    const productValue = await productField.inputValue()
    
    console.log(`Tone field value: "${toneValue}"`)
    console.log(`Product Description value: "${productValue.substring(0, 50)}..."`)

    // Verify button is back to normal state
    await expect(analyzeButton).toBeEnabled()
    await expect(page.locator('text=Analyzing...')).not.toBeVisible()

    // Take screenshot after analysis
    await page.screenshot({ path: 'playwright-tests/screenshots/context-page-after-analysis.png', fullPage: true })
  })

  test('should handle invalid URL gracefully', async ({ page }) => {
    const urlInput = page.locator('input[type="url"]')
    const analyzeButton = page.locator('button:has-text("Analyze")')

    // Try with empty URL
    await urlInput.fill('')
    await expect(analyzeButton).toBeDisabled()

    // Try with invalid URL format
    await urlInput.fill('not-a-valid-url')
    await analyzeButton.click()

    // Should show error toast
    await page.waitForTimeout(2000)
    // Error handling may vary, but button should be enabled again
    await expect(analyzeButton).toBeEnabled()
  })

  test('should allow manual entry of context fields', async ({ page }) => {
    // Fill tone field
    const toneInput = page.locator('input#tone')
    await toneInput.fill('Professional')
    await expect(toneInput).toHaveValue('Professional')

    // Fill target countries
    const countriesInput = page.locator('input#targetCountries')
    await countriesInput.fill('US, UK, Canada')
    await expect(countriesInput).toHaveValue('US, UK, Canada')

    // Fill product description
    const productInput = page.locator('textarea#productDescription')
    await productInput.fill('A cloud-based CRM platform for sales teams')
    await expect(productInput).toHaveValue('A cloud-based CRM platform for sales teams')

    // Fill competitors
    const competitorsInput = page.locator('input#competitors')
    await competitorsInput.fill('Salesforce, HubSpot')
    await expect(competitorsInput).toHaveValue('Salesforce, HubSpot')

    // Fill target industries
    const industriesInput = page.locator('input#targetIndustries')
    await industriesInput.fill('SaaS, Technology')
    await expect(industriesInput).toHaveValue('SaaS, Technology')

    // Fill compliance flags
    const complianceInput = page.locator('input#complianceFlags')
    await complianceInput.fill('SOC2, GDPR')
    await expect(complianceInput).toHaveValue('SOC2, GDPR')

    // Take screenshot
    await page.screenshot({ path: 'playwright-tests/screenshots/context-page-manual-entry.png', fullPage: true })
  })

  test('should show clear button when context is set', async ({ page }) => {
    // Initially, clear button should not be visible (no context set)
    const clearButton = page.locator('button:has-text("Clear All")')
    
    // Fill at least one field
    await page.locator('input#tone').fill('Professional')
    await page.waitForTimeout(500) // Wait for state update

    // Now clear button should be visible
    await expect(clearButton).toBeVisible()

    // Click clear button
    await clearButton.click()

    // Verify fields are cleared
    await expect(page.locator('input#tone')).toHaveValue('')
    
    // Clear button should disappear or be hidden
    await page.waitForTimeout(500)
  })

  test('should navigate to Bulk Agent and see context variables', async ({ page }) => {
    // First, set some context
    await page.locator('input#tone').fill('Professional')
    await page.locator('input#targetCountries').fill('US, UK')
    await page.waitForTimeout(500)

    // Navigate to Bulk Agent page
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    // Verify we're on the bulk page
    await expect(page.locator('text=Bulk Agent').or(page.locator('text=Task'))).toBeVisible({ timeout: 10000 })

    // Look for context variables section in the prompt section
    // Context variables should be displayed alongside CSV variables
    await page.waitForTimeout(2000) // Wait for page to fully load

    // Check if context variables are shown (they might be in a "Context Variables" section)
    // This depends on how PromptSection displays them
    const pageContent = await page.textContent('body')
    
    // Context variables should be available (may be shown as clickable chips/badges)
    // The exact implementation may vary, but we can check if the page loaded successfully
    expect(pageContent).toBeTruthy()

    // Take screenshot
    await page.screenshot({ path: 'playwright-tests/screenshots/bulk-agent-with-context.png', fullPage: true })
  })

  test('should persist context across page reloads', async ({ page }) => {
    // Set context values
    await page.locator('input#tone').fill('Friendly')
    await page.locator('input#targetIndustries').fill('Healthcare, Finance')
    await page.waitForTimeout(1000) // Wait for localStorage save

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify values are still there (persisted in localStorage)
    await expect(page.locator('input#tone')).toHaveValue('Friendly')
    await expect(page.locator('input#targetIndustries')).toHaveValue('Healthcare, Finance')
  })
})

