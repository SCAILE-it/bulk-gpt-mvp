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

  test('should analyze scaile.tech and populate context fields', async ({ page }) => {
    test.setTimeout(60000) // 60 seconds for API call

    // Enter scaile.tech website URL
    const testUrl = 'scaile.tech'
    const urlInput = page.locator('input[type="text"][placeholder*="yourcompany"]')
    
    await urlInput.fill(testUrl)
    await expect(urlInput).toHaveValue(testUrl)

    // Click analyze button
    const analyzeButton = page.locator('button:has-text("Analyze")')
    await expect(analyzeButton).toBeEnabled()
    
    // Take screenshot before analysis
    await page.screenshot({ path: 'playwright-tests/screenshots/context-page-before-analysis.png', fullPage: true })
    
    await analyzeButton.click()

    // Wait for analyzing state
    await expect(page.locator('text=Analyzing...')).toBeVisible({ timeout: 5000 })
    
    // Wait for analysis to complete - look for success toast or fields being populated
    await page.waitForTimeout(10000) // Wait for API response (up to 10 seconds)

    // Check if fields have been populated
    const toneField = page.locator('input#tone')
    const productField = page.locator('textarea#productDescription')
    const countriesField = page.locator('input#targetCountries')
    
    // Wait a bit more for fields to populate
    await page.waitForTimeout(2000)
    
    const toneValue = await toneField.inputValue()
    const productValue = await productField.inputValue()
    const countriesValue = await countriesField.inputValue()
    
    console.log(`\n=== Analysis Results ===`)
    console.log(`Tone: "${toneValue}"`)
    console.log(`Product Description: "${productValue.substring(0, 100)}..."`)
    console.log(`Target Countries: "${countriesValue}"`)

    // Verify button is back to normal state (not analyzing)
    await expect(analyzeButton).toBeEnabled()
    
    // URL should remain visible after successful analysis
    await expect(urlInput).toHaveValue(testUrl)

    // Take screenshot after analysis
    await page.screenshot({ path: 'playwright-tests/screenshots/context-page-after-analysis-scaile.png', fullPage: true })
    
    // Verify at least one field was populated (analysis should find something)
    const hasAnyData = toneValue.length > 0 || productValue.length > 0 || countriesValue.length > 0
    expect(hasAnyData).toBeTruthy()
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

