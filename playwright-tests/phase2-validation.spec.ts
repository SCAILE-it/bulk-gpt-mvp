/**
 * Phase 2 UI Validation Tests
 * Tests for features extracted during Phase 2 optimization:
 * - useVariableValidation hook
 * - useWebhookValidation hook
 * - useBetaBanner hook
 * - Template gallery (PROMPT_TEMPLATES constants)
 */

import { test, expect } from '@playwright/test'
import path from 'path'

// Phase 2 tests don't require authentication - testing UI features only

test.describe('Phase 2: Variable Validation', () => {
  test('shows warning for missing variables in CSV', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV with columns: name, email, company
    const csvContent = 'name,email,company\nJohn Doe,john@example.com,Acme Corp'
    const buffer = Buffer.from(csvContent)
    const dataTransfer = await page.evaluateHandle((data) => {
      const dt = new DataTransfer()
      const file = new File([new Uint8Array(data)], 'test.csv', { type: 'text/csv' })
      dt.items.add(file)
      return dt
    }, Array.from(buffer))

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer
    })

    // Wait for CSV to parse
    await page.waitForSelector('text=/rows.*columns/i', { timeout: 5000 })

    // Enter prompt with variables that DON'T exist in CSV
    const promptField = page.locator('textarea[placeholder*="prompt" i], textarea[placeholder*="bio" i]').first()
    await promptField.fill('Write about {{first_name}} at {{organization}} who specializes in {{skill}}')

    // Verify warning appears for missing variables
    await expect(page.locator('text=/Missing variables/i')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=/first_name/i')).toBeVisible()
    await expect(page.locator('text=/organization/i')).toBeVisible()
    await expect(page.locator('text=/skill/i')).toBeVisible()

    await page.screenshot({ path: 'test-results/phase2-screenshots/variable-validation-warning.png', fullPage: true })
  })

  test('shows success when all variables match CSV columns', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV
    const csvContent = 'name,company\nJohn,Acme'
    const buffer = Buffer.from(csvContent)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'valid.csv',
      mimeType: 'text/csv',
      buffer
    })

    await page.waitForSelector('text=/rows.*columns/i', { timeout: 5000 })

    // Enter prompt with MATCHING variables
    const promptField = page.locator('textarea').first()
    await promptField.fill('Write about {{name}} at {{company}}')

    // Verify NO warning (or success message)
    const warningVisible = await page.locator('text=/Missing variables/i').isVisible().catch(() => false)
    expect(warningVisible).toBe(false)

    await page.screenshot({ path: 'test-results/phase2-screenshots/variable-validation-success.png', fullPage: true })
  })
})

test.describe('Phase 2: Webhook URL Validation', () => {
  test('shows error for HTTP (non-HTTPS) URL', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    // Find webhook URL input
    const webhookInput = page.locator('input[placeholder*="webhook" i], input[placeholder*="hooks.n8n" i]').first()
    await webhookInput.scrollIntoViewIfNeeded()
    await webhookInput.fill('http://example.com/webhook')

    // Wait a bit for validation to trigger
    await page.waitForTimeout(500)

    // Verify error message appears
    await expect(page.locator('text=/must use HTTPS/i, text=/not HTTP/i')).toBeVisible({ timeout: 3000 })

    // Verify input has error styling (red border)
    const inputClasses = await webhookInput.getAttribute('class')
    expect(inputClasses).toContain('border-orange') // or 'border-red'

    await page.screenshot({ path: 'test-results/phase2-screenshots/webhook-validation-http-error.png', fullPage: true })
  })

  test('accepts valid HTTPS URL', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    const webhookInput = page.locator('input[placeholder*="webhook" i], input[placeholder*="hooks.n8n" i]').first()
    await webhookInput.scrollIntoViewIfNeeded()
    await webhookInput.fill('https://hooks.n8n.cloud/webhook/abc123')

    await page.waitForTimeout(500)

    // Verify NO error message
    const errorVisible = await page.locator('text=/must use HTTPS/i').isVisible().catch(() => false)
    expect(errorVisible).toBe(false)

    await page.screenshot({ path: 'test-results/phase2-screenshots/webhook-validation-https-success.png', fullPage: true })
  })
})

test.describe('Phase 2: Delete Output Field Confirmation', () => {
  test('shows confirmation modal when deleting output field', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    // Find output field section
    await page.locator('text=/Output Columns/i').scrollIntoViewIfNeeded()

    // Click X button on the "bio" field
    const deleteButton = page.locator('button:has-text("×"), button:has(svg)').filter({ hasText: /bio/i }).or(
      page.locator('div:has-text("bio") button:has(svg[class*="lucide"])')
    ).first()

    await deleteButton.click()

    // Verify modal appears
    await expect(page.locator('text=/Delete Output Field/i, text=/Are you sure/i')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('button:has-text("Cancel"), button:has-text("Delete")')).toBeVisible()

    await page.screenshot({ path: 'test-results/phase2-screenshots/delete-field-modal.png', fullPage: true })

    // Test cancel functionality
    await page.locator('button:has-text("Cancel")').click()

    // Modal should close
    const modalStillVisible = await page.locator('text=/Delete Output Field/i').isVisible().catch(() => false)
    expect(modalStillVisible).toBe(false)
  })
})

test.describe('Phase 2: Template Gallery', () => {
  test('opens template gallery and shows templates', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    // Find and click template gallery button
    const templateButton = page.locator('button:has-text("Browse Templates"), button:has-text("Template")').first()
    await templateButton.click()

    // Verify modal opens
    await expect(page.locator('text=/Template Gallery/i')).toBeVisible({ timeout: 3000 })

    // Verify templates are displayed
    await expect(page.locator('text=/Professional Bio/i, text=/Content Summarizer/i, text=/Data Extractor/i')).toBeVisible()

    await page.screenshot({ path: 'test-results/phase2-screenshots/template-gallery-modal.png', fullPage: true })
  })

  test('filters templates by search query', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    const templateButton = page.locator('button:has-text("Browse Templates"), button:has-text("Template")').first()
    await templateButton.click()

    await expect(page.locator('text=/Template Gallery/i')).toBeVisible()

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search" i]').first()
    await searchInput.fill('bio')

    // Verify only matching templates shown
    await expect(page.locator('text=/Professional Bio/i')).toBeVisible()

    // Other templates should not be visible
    const summarizerVisible = await page.locator('text=/Content Summarizer/i').isVisible().catch(() => false)
    expect(summarizerVisible).toBe(false)

    await page.screenshot({ path: 'test-results/phase2-screenshots/template-search.png', fullPage: true })
  })

  test('filters templates by category', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    const templateButton = page.locator('button:has-text("Browse Templates"), button:has-text("Template")').first()
    await templateButton.click()

    await expect(page.locator('text=/Template Gallery/i')).toBeVisible()

    // Click "Content" category filter
    const contentFilter = page.locator('button:has-text("Content")').first()
    await contentFilter.click()

    // Verify only content templates shown
    await expect(page.locator('text=/Professional Bio/i')).toBeVisible()

    await page.screenshot({ path: 'test-results/phase2-screenshots/template-category-filter.png', fullPage: true })
  })

  test('applies template to prompt field', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    const templateButton = page.locator('button:has-text("Browse Templates"), button:has-text("Template")').first()
    await templateButton.click()

    await expect(page.locator('text=/Template Gallery/i')).toBeVisible()

    // Click on a template card
    const bioTemplate = page.locator('text=/Professional Bio/i').locator('..').locator('..')
    await bioTemplate.click()

    // Modal should close
    await page.waitForTimeout(500)
    const modalClosed = await page.locator('text=/Template Gallery/i').isVisible().catch(() => false)
    expect(modalClosed).toBe(false)

    // Verify prompt field updated with template text
    const promptField = page.locator('textarea').first()
    const promptValue = await promptField.inputValue()
    expect(promptValue).toContain('professional bio')
    expect(promptValue).toContain('{{name}}')

    await page.screenshot({ path: 'test-results/phase2-screenshots/template-applied.png', fullPage: true })
  })
})

test.describe('Phase 2: Beta Banner', () => {
  test('displays beta banner with usage stats', async ({ page }) => {
    // Clear localStorage to ensure banner shows
    await page.goto('/bulk')
    await page.evaluate(() => localStorage.removeItem('bulk-beta-banner-dismissed'))
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify banner is visible
    await expect(page.locator('text=/BETA/i')).toBeVisible({ timeout: 3000 })

    // Verify usage stats display (X/Y batches format)
    await expect(page.locator('text=/batches today/i, text=/batch/i')).toBeVisible()

    await page.screenshot({ path: 'test-results/phase2-screenshots/beta-banner.png', fullPage: true })
  })

  test('dismisses beta banner and persists to localStorage', async ({ page }) => {
    await page.goto('/bulk')
    await page.evaluate(() => localStorage.removeItem('bulk-beta-banner-dismissed'))
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Find and click close button
    const closeButton = page.locator('button[aria-label*="Dismiss" i], button:has(svg):near(text=/BETA/i)').first()
    await closeButton.click()

    // Banner should disappear
    await page.waitForTimeout(500)
    const bannerVisible = await page.locator('text=/BETA/i').isVisible().catch(() => false)
    expect(bannerVisible).toBe(false)

    // Verify localStorage persistence
    const dismissed = await page.evaluate(() => localStorage.getItem('bulk-beta-banner-dismissed'))
    expect(dismissed).toBe('true')

    // Reload and verify banner stays hidden
    await page.reload()
    await page.waitForLoadState('networkidle')
    const bannerAfterReload = await page.locator('text=/BETA/i').isVisible().catch(() => false)
    expect(bannerAfterReload).toBe(false)

    await page.screenshot({ path: 'test-results/phase2-screenshots/beta-banner-dismissed.png', fullPage: true })
  })
})

test.describe('Phase 2: Keyboard Shortcuts', () => {
  test('Cmd+O opens file picker', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    // Create a promise that resolves when file chooser opens
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 })

    // Trigger Cmd+O (Meta+O on Mac, Ctrl+O on Windows/Linux)
    await page.keyboard.press('Meta+KeyO')

    // Verify file chooser opened
    const fileChooser = await fileChooserPromise
    expect(fileChooser).toBeTruthy()

    // Cancel the file chooser
    await fileChooser.cancel()
  })
})

test.describe('Phase 2: API Access Modal', () => {
  test('shows API access modal with curl command', async ({ page }) => {
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    // Scroll to bottom and find API access button
    const apiButton = page.locator('button:has-text("Show curl command"), button:has-text("API Access")').first()
    await apiButton.scrollIntoViewIfNeeded()
    await apiButton.click()

    // Verify modal opens
    await expect(page.locator('text=/API Access/i')).toBeVisible({ timeout: 3000 })

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate")').first()
    if (await generateButton.isVisible()) {
      await generateButton.click()
      await page.waitForTimeout(1000)
    }

    // Verify curl code block appears
    await expect(page.locator('pre, code').filter({ hasText: /curl/i })).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'test-results/phase2-screenshots/api-access-modal.png', fullPage: true })
  })
})
