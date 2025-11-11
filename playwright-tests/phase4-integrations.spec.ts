/**
 * Phase 4 Integration Tests
 * Tests for Token Usage Display, JSON Schema Toggle, and Auto-Column Generation
 */

import { test, expect } from '@playwright/test'

test.describe('Phase 4: Backend Integrations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/bulk')
    await page.waitForLoadState('networkidle')
  })

  test('Token Usage Display - should show per-row tokens and total cost', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-data/sample-bulk.csv')
    await expect(page.locator('text=2 rows')).toBeVisible({ timeout: 10000 })

    // Configure prompt
    await page.locator('textarea[placeholder*="prompt"]').fill('Write a bio for {{name}} at {{company}}')

    // Test with 1 row first
    await page.locator('button:has-text("Test (1 row)")').click()

    // Wait for result with tokens
    await expect(page.locator('text=Done').first()).toBeVisible({ timeout: 60000 })

    // Verify token column appears
    await expect(page.locator('th:has-text("Tokens")')).toBeVisible()

    // Verify per-row token display (should show format: "XXX in / XXX out")
    const tokenCell = page.locator('td').filter({ hasText: /\d+ in \/ \d+ out/ }).first()
    await expect(tokenCell).toBeVisible()

    // Verify token summary footer appears
    await expect(page.locator('text=Token Usage')).toBeVisible()
    await expect(page.locator('text=Input:')).toBeVisible()
    await expect(page.locator('text=Output:')).toBeVisible()
    await expect(page.locator('text=Est. Cost:')).toBeVisible()

    // Verify cost format (should start with $)
    const costText = await page.locator('text=Est. Cost:').locator('..').locator('.font-mono').textContent()
    expect(costText).toMatch(/^\$\d+\.\d+/)
  })

  test('JSON Schema Toggle - should switch between JSON and free-form modes', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-data/sample-bulk.csv')
    await expect(page.locator('text=2 rows')).toBeVisible({ timeout: 10000 })

    // Verify JSON mode is ON by default
    const toggle = page.locator('button[aria-label*="Switch to free-form"]')
    await expect(toggle).toBeVisible()

    // Verify output columns section is visible in JSON mode
    await expect(page.locator('text=Output Column Names')).toBeVisible()

    // Verify description shows JSON mode
    await expect(page.locator('text=JSON mode: AI returns structured data')).toBeVisible()

    // Switch to free-form mode
    await toggle.click()

    // Verify output columns section is hidden
    await expect(page.locator('text=Output Column Names')).not.toBeVisible()

    // Verify description shows free-form mode
    await expect(page.locator('text=Free-form mode: AI returns unstructured text')).toBeVisible()

    // Switch back to JSON mode
    await page.locator('button[aria-label*="Switch to JSON mode"]').click()

    // Verify output columns section is visible again
    await expect(page.locator('text=Output Column Names')).toBeVisible()
  })

  test('Auto-Column Generation - should generate columns from prompt', async ({ page }) => {
    // Configure prompt first (without CSV)
    const promptTextarea = page.locator('textarea[placeholder*="prompt"]')
    await promptTextarea.fill('Analyze {{company}} and provide: market position, key competitors, and growth potential')

    // Verify "Generate Columns from Prompt" button appears
    const generateButton = page.locator('button:has-text("Generate Columns from Prompt")')
    await expect(generateButton).toBeVisible()

    // Click generate button
    await generateButton.click()

    // Verify loading state
    await expect(page.locator('text=Generating columns...')).toBeVisible({ timeout: 5000 })

    // Wait for success toast
    await expect(page.locator('text=Generated').first()).toBeVisible({ timeout: 30000 })

    // Verify columns were added to output fields
    // Should have detected: market_position, key_competitors, growth_potential
    const outputFields = page.locator('.font-mono').filter({ hasText: /market|competitor|growth/i })
    await expect(outputFields.first()).toBeVisible({ timeout: 5000 })
  })

  test('Full Integration - all three features working together', async ({ page }) => {
    // 1. Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-data/sample-bulk.csv')
    await expect(page.locator('text=2 rows')).toBeVisible({ timeout: 10000 })

    // 2. Configure prompt
    await page.locator('textarea[placeholder*="prompt"]').fill('Create a professional summary for {{name}} at {{company}}')

    // 3. Generate columns automatically
    const generateButton = page.locator('button:has-text("Generate Columns from Prompt")')
    if (await generateButton.isVisible()) {
      await generateButton.click()
      await expect(page.locator('text=Generated').first()).toBeVisible({ timeout: 30000 })
    }

    // 4. Verify JSON mode is active
    await expect(page.locator('text=JSON mode: AI returns structured data')).toBeVisible()

    // 5. Run test with 1 row
    await page.locator('button:has-text("Test (1 row)")').click()
    await expect(page.locator('text=Done').first()).toBeVisible({ timeout: 60000 })

    // 6. Verify token usage is displayed
    await expect(page.locator('th:has-text("Tokens")')).toBeVisible()
    await expect(page.locator('text=Token Usage')).toBeVisible()
    await expect(page.locator('text=Est. Cost:')).toBeVisible()

    // 7. Switch to free-form mode
    await page.locator('button[aria-label*="Switch to free-form"]').click()
    await expect(page.locator('text=Free-form mode')).toBeVisible()

    // 8. Run full batch in free-form mode
    await page.locator('button:has-text("Run All")').click()
    await expect(page.locator('text=2/2 rows').first()).toBeVisible({ timeout: 90000 })

    // 9. Verify tokens still tracked in free-form mode
    const tokenCells = page.locator('td').filter({ hasText: /\d+ in \/ \d+ out/ })
    expect(await tokenCells.count()).toBeGreaterThan(0)
  })

  test('Generate Columns - error handling', async ({ page }) => {
    // Try to generate columns without a prompt
    const generateButton = page.locator('button:has-text("Generate Columns from Prompt")')

    // Button should not be visible without prompt
    await expect(generateButton).not.toBeVisible()

    // Add a prompt
    await page.locator('textarea[placeholder*="prompt"]').fill('test prompt')

    // Button should now be visible
    await expect(generateButton).toBeVisible()

    // Button should be enabled
    await expect(generateButton).toBeEnabled()
  })

  test('Token Summary - cost calculation accuracy', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-data/sample-bulk.csv')
    await expect(page.locator('text=2 rows')).toBeVisible({ timeout: 10000 })

    // Configure simple prompt
    await page.locator('textarea[placeholder*="prompt"]').fill('Say hello to {{name}}')

    // Run test
    await page.locator('button:has-text("Test (1 row)")').click()
    await expect(page.locator('text=Done').first()).toBeVisible({ timeout: 60000 })

    // Get token counts
    const inputTokensText = await page.locator('text=Input:').locator('..').locator('.font-mono').textContent()
    const outputTokensText = await page.locator('text=Output:').locator('..').locator('.font-mono').textContent()
    const totalTokensText = await page.locator('text=Total:').locator('..').locator('.font-mono').textContent()

    // Parse numbers (remove commas)
    const inputTokens = parseInt(inputTokensText?.replace(/,/g, '') || '0')
    const outputTokens = parseInt(outputTokensText?.replace(/,/g, '') || '0')
    const totalTokens = parseInt(totalTokensText?.replace(/,/g, '') || '0')

    // Verify total = input + output
    expect(totalTokens).toBe(inputTokens + outputTokens)

    // Verify cost calculation (Gemini 2.5 Flash pricing)
    const expectedCost = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30

    const costText = await page.locator('text=Est. Cost:').locator('..').locator('.font-mono').textContent()
    const actualCost = parseFloat(costText?.replace('$', '') || '0')

    // Cost should be very close (within 0.0001)
    expect(Math.abs(actualCost - expectedCost)).toBeLessThan(0.0001)
  })

  test('JSON vs Free-form Output Comparison', async ({ page }) => {
    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-data/sample-bulk.csv')
    await expect(page.locator('text=2 rows')).toBeVisible({ timeout: 10000 })

    const prompt = 'Describe {{company}} in one sentence'
    await page.locator('textarea[placeholder*="prompt"]').fill(prompt)

    // Test JSON mode first
    await expect(page.locator('text=JSON mode: AI returns structured data')).toBeVisible()
    await page.locator('button:has-text("Test (1 row)")').click()
    await expect(page.locator('text=Done').first()).toBeVisible({ timeout: 60000 })

    // Get JSON mode output
    const jsonOutput = await page.locator('tbody tr').first().locator('td').nth(3).textContent()

    // Switch to free-form mode
    await page.locator('button[aria-label*="Switch to free-form"]').click()
    await expect(page.locator('text=Free-form mode')).toBeVisible()

    // Clear previous results by reloading
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Re-upload and configure
    await fileInput.setInputFiles('test-data/sample-bulk.csv')
    await expect(page.locator('text=2 rows')).toBeVisible({ timeout: 10000 })
    await page.locator('textarea[placeholder*="prompt"]').fill(prompt)

    // Switch to free-form
    await page.locator('button[aria-label*="Switch to free-form"]').click()

    // Test free-form mode
    await page.locator('button:has-text("Test (1 row)")').click()
    await expect(page.locator('text=Done').first()).toBeVisible({ timeout: 60000 })

    // Get free-form output
    const freeformOutput = await page.locator('tbody tr').first().locator('td').nth(3).textContent()

    // Outputs should be different (JSON is structured, free-form is not)
    expect(jsonOutput).not.toBe(freeformOutput)
  })
})
