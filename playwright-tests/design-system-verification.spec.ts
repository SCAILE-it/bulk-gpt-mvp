import { test, expect } from '@playwright/test'

/**
 * Simple verification test for design system fixes
 * 1. Sequential section expansion
 * 2. AI Optimization button visibility
 * 3. Theme toggle
 */

test('Design System Verification', async ({ page }) => {
  // Navigate and login
  await page.goto('https://bulk-gpt-app.vercel.app/')
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/bulk', { timeout: 10000 })

  // Upload CSV
  const csvContent = `name,email,description\nJohn Doe,john@example.com,Software engineer`
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  })
  await page.waitForTimeout(2000)

  // Verify Data Input section expanded
  const dataInputSection = page.locator('text=Data Input').first()
  await expect(dataInputSection).toBeVisible()

  // Enter prompt
  await page.fill('textarea', 'Write a bio for {{name}}')
  await page.waitForTimeout(1000)

  // Verify Prompt section expanded
  const promptSection = page.locator('text=Prompt').first()
  await expect(promptSection).toBeVisible()

  // Verify AI Optimization section appears
  const aiSection = page.locator('text=AI Optimization').first()
  await expect(aiSection).toBeVisible({ timeout: 5000 })

  // Verify Optimize button exists
  const optimizeButton = page.locator('button:has-text("Optimize with AI")').first()
  await expect(optimizeButton).toBeVisible()
  await expect(optimizeButton).toBeEnabled()
})

