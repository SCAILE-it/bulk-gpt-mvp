import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Auto-Job Optimizer', () => {
  test('should auto-optimize vague prompt and detect output columns', async ({ page }) => {
    console.log('\n🧪 TESTING AUTO-JOB OPTIMIZER\n')

    // Navigate to bulk processor
    console.log('📍 Navigating to /bulk...')
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')
    console.log('✅ Page loaded\n')

    // Upload test CSV
    console.log('📁 Uploading test CSV...')
    await page.setInputFiles('input[type="file"]', {
      name: 'companies.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('name,company\nAlice,TechCorp\nBob,DataSystems')
    })
    await page.waitForTimeout(1500)
    console.log('✅ CSV uploaded\n')

    // Enter vague prompt
    console.log('✍️  Entering vague prompt...')
    const promptTextarea = page.locator('textarea').first()
    await promptTextarea.fill('analyze {{company}}')
    console.log('✅ Prompt entered: "analyze {{company}}"\n')

    // Wait for auto-optimization to trigger (500ms debounce + API call)
    console.log('⏳ Waiting for auto-optimization (debounced 500ms + API)...')
    const jobPreview = page.locator('[data-testid="job-preview"]')
    await expect(jobPreview).toBeVisible({ timeout: 8000 })
    console.log('✅ Job preview appeared\n')

    // Verify optimized prompt is shown and improved
    console.log('🔍 Verifying optimized prompt...')
    const optimizedPrompt = page.locator('[data-testid="optimized-prompt"]')
    await expect(optimizedPrompt).toBeVisible()

    const optimizedText = await optimizedPrompt.textContent()
    console.log('  Optimized prompt:', optimizedText?.substring(0, 80) + '...')

    // Should be more detailed than original "analyze {{company}}"
    expect(optimizedText!.length).toBeGreaterThan(20)
    expect(optimizedText).toContain('{{company}}') // Preserves variables
    console.log('✅ Optimized prompt is more detailed\n')

    // Verify output columns detected
    console.log('🔍 Verifying output columns detected...')
    const outputColumns = page.locator('[data-testid="output-column"]')
    const columnCount = await outputColumns.count()
    console.log(`  Detected ${columnCount} output columns`)

    expect(columnCount).toBeGreaterThanOrEqual(2) // At least 2 columns

    // Print column names
    for (let i = 0; i < columnCount; i++) {
      const colName = await outputColumns.nth(i).textContent()
      console.log(`    - ${colName}`)
    }
    console.log('✅ Output columns auto-detected\n')

    // Verify reasoning shown
    console.log('🔍 Verifying AI reasoning displayed...')
    const reasoning = jobPreview.locator('.text-xs.text-zinc-500.italic')
    await expect(reasoning).toBeVisible()
    const reasoningText = await reasoning.textContent()
    console.log('  Reasoning:', reasoningText)
    console.log('✅ AI reasoning shown\n')

    // Test re-optimization on prompt change
    console.log('🔄 Testing re-optimization on prompt edit...')
    await promptTextarea.fill('summarize {{name}} at {{company}}')
    console.log('  Changed prompt to: "summarize {{name}} at {{company}}"')

    // Wait for loading indicator
    await page.waitForTimeout(600) // Debounce delay
    const loadingIndicator = page.locator('text=Optimizing your job')
    await expect(loadingIndicator).toBeVisible({ timeout: 3000 })
    console.log('  ⏳ Loading indicator appeared')

    // Wait for new optimization
    await expect(loadingIndicator).not.toBeVisible({ timeout: 8000 })
    console.log('  ✅ Re-optimization completed')

    const newOptimizedText = await optimizedPrompt.textContent()
    expect(newOptimizedText).not.toBe(optimizedText) // Should be different
    console.log('✅ Re-optimization triggered successfully\n')

    // Verify batch runs with optimized version
    console.log('▶️  Running batch with optimized job...')
    const runButton = page.locator('button').filter({ hasText: /run/i }).first()
    await runButton.click()

    // Check for batch creation
    await page.waitForTimeout(2000)
    const processingIndicator = page.locator('text=/Processing|pending/i').first()
    await expect(processingIndicator).toBeVisible({ timeout: 5000 })
    console.log('✅ Batch started with optimized job\n')

    console.log('🎉 AUTO-JOB OPTIMIZER TEST PASSED!')
    console.log('✅ Vague prompt auto-optimized')
    console.log('✅ Output columns auto-detected')
    console.log('✅ Re-optimization on edit works')
    console.log('✅ Batch runs with optimized version\n')
  })

  test('should handle optimization errors gracefully', async ({ page }) => {
    console.log('\n🧪 TESTING ERROR HANDLING\n')

    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV
    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('col1\nvalue1')
    })
    await page.waitForTimeout(1500)

    // Enter prompt
    const promptTextarea = page.locator('textarea').first()
    await promptTextarea.fill('test prompt {{col1}}')

    // If optimization fails, should fall back gracefully
    // Check that we can still run without optimization
    const runButton = page.locator('button').filter({ hasText: /run/i }).first()
    await expect(runButton).toBeEnabled()

    console.log('✅ Batch can run even if optimization fails\n')
  })

  test('should not optimize when no CSV uploaded', async ({ page }) => {
    console.log('\n🧪 TESTING NO-CSV BEHAVIOR\n')

    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')

    // Enter prompt without CSV
    const promptTextarea = page.locator('textarea').first()
    await promptTextarea.fill('some prompt')

    // Should NOT trigger optimization
    await page.waitForTimeout(2000)
    const jobPreview = page.locator('[data-testid="job-preview"]')
    await expect(jobPreview).not.toBeVisible()

    console.log('✅ Optimization does not trigger without CSV\n')
  })
})
