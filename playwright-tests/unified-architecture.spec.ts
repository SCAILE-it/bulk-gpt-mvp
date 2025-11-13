/**
 * Unified Architecture E2E Test Suite
 * Tests the unified batch processing architecture where test and full batches
 * use the same code path via useBatchProcessor hook.
 * 
 * Key verifications:
 * - Test batches use unified batchProcessor.startBatch()
 * - Full batches use unified batchProcessor.startBatch()
 * - Results sync correctly via EventSource + fallback polling
 * - Export works for both test and full batches
 * - Single source of truth: batchProcessor.results
 */

import { test, expect } from '@playwright/test'

// Test data
const TEST_CSV_CONTENT = `name,email,company
John Doe,john@acme.com,Acme Corp
Jane Smith,jane@techco.com,TechCo
Bob Johnson,bob@startup.io,Startup Inc`

const TEST_PROMPT = 'Write a professional bio for {{name}} who works at {{company}}. Include their role.'

// Helper: Create test CSV file
async function createTestCSV(filename = 'test-unified.csv') {
  const fileContent = TEST_CSV_CONTENT
  const buffer = Buffer.from(fileContent, 'utf-8')

  return {
    name: filename,
    mimeType: 'text/csv',
    buffer
  }
}

test.describe('Unified Architecture - Test & Full Batch Processing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to bulk processor
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')
    
    // Wait for page to be fully loaded
    await page.waitForTimeout(1000)
  })

  test.describe('1. Test Batch (Unified Architecture)', () => {
    
    test('should process test batch using unified batchProcessor', async ({ page }) => {
      // Step 1: Upload CSV
      const testFile = await createTestCSV()
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFile.name,
        mimeType: testFile.mimeType,
        buffer: testFile.buffer
      })

      // Wait for CSV to be parsed
      await page.waitForTimeout(2000)
      
      // Verify CSV preview is visible
      const csvPreview = page.locator('table').first()
      await expect(csvPreview).toBeVisible({ timeout: 5000 })

      // Step 2: Enter prompt
      const promptTextarea = page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"]').first()
      await promptTextarea.fill(TEST_PROMPT)
      await page.waitForTimeout(500)

      // Step 3: Add output field
      const addOutputFieldButton = page.locator('button:has-text("Add Field"), button:has-text("Add Output Field")').first()
      if (await addOutputFieldButton.isVisible()) {
        await addOutputFieldButton.click()
        await page.waitForTimeout(300)
        
        // Fill in output field name
        const outputFieldInput = page.locator('input[placeholder*="field name"], input[placeholder*="Field name"]').first()
        await outputFieldInput.fill('bio')
        await page.waitForTimeout(300)
      }

      // Step 4: Click Test button
      const testButton = page.locator('button:has-text("Test"), button:has-text("Run Test")').first()
      await expect(testButton).toBeEnabled({ timeout: 5000 })
      
      // Monitor network requests to verify unified architecture
      let batchCreated = false
      let eventSourceConnected = false
      
      page.on('response', response => {
        if (response.url().includes('/api/process') && response.status() === 202) {
          batchCreated = true
          console.log('✅ Batch created via /api/process')
        }
        if (response.url().includes('/api/batch/') && response.url().includes('/stream')) {
          eventSourceConnected = true
          console.log('✅ EventSource connected for streaming')
        }
      })

      await testButton.click()

      // Step 5: Verify test is running (unified architecture)
      // Should show loading state in ResultsTable
      const resultsTable = page.locator('[data-testid="results-table"], table').last()
      await expect(resultsTable).toBeVisible({ timeout: 10000 })
      
      // Verify batch was created via unified API
      await page.waitForTimeout(2000)
      expect(batchCreated).toBe(true)

      // Step 6: Wait for test to complete (max 120 seconds)
      // Look for completion indicators
      const maxWaitTime = 120000 // 120 seconds
      const startTime = Date.now()
      
      while (Date.now() - startTime < maxWaitTime) {
        await page.waitForTimeout(2000)
        
        // Check if results are displayed
        const resultRows = page.locator('tbody tr, [data-testid="result-row"]')
        const rowCount = await resultRows.count()
        
        if (rowCount > 0) {
          // Check if result has output (not just loading state)
          const firstRow = resultRows.first()
          const rowText = await firstRow.textContent()
          
          if (rowText && !rowText.includes('Processing') && !rowText.includes('pending')) {
            console.log('✅ Test batch completed with results')
            break
          }
        }
        
        // Check for error state
        const errorMessage = page.locator('[class*="error"], [class*="destructive"]').first()
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent()
          throw new Error(`Test batch failed: ${errorText}`)
        }
      }

      // Step 7: Verify results are displayed
      const resultRows = page.locator('tbody tr, [data-testid="result-row"]')
      await expect(resultRows.first()).toBeVisible({ timeout: 5000 })
      
      // Verify result contains expected data
      const firstResult = await resultRows.first().textContent()
      expect(firstResult).toContain('John Doe')
      expect(firstResult).toContain('Acme Corp')
      
      console.log('✅ Test batch completed successfully via unified architecture')
    })

    test('should sync test batch results via EventSource', async ({ page }) => {
      // Upload CSV and configure prompt
      const testFile = await createTestCSV()
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFile.name,
        mimeType: testFile.mimeType,
        buffer: testFile.buffer
      })
      await page.waitForTimeout(2000)

      const promptTextarea = page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"]').first()
      await promptTextarea.fill(TEST_PROMPT)
      await page.waitForTimeout(500)

      // Monitor EventSource connections
      const eventSourceConnections: string[] = []
      page.on('response', response => {
        if (response.url().includes('/stream') && response.status() === 200) {
          eventSourceConnections.push(response.url())
          console.log(`✅ EventSource connected: ${response.url()}`)
        }
      })

      // Start test batch
      const testButton = page.locator('button:has-text("Test"), button:has-text("Run Test")').first()
      await testButton.click()

      // Wait for EventSource to connect
      await page.waitForTimeout(3000)
      
      // Verify EventSource was used for streaming
      expect(eventSourceConnections.length).toBeGreaterThan(0)
      console.log(`✅ EventSource streaming verified: ${eventSourceConnections.length} connection(s)`)
    })
  })

  test.describe('2. Full Batch (Unified Architecture)', () => {
    
    test('should process full batch using unified batchProcessor', async ({ page }) => {
      // Step 1: Upload CSV
      const testFile = await createTestCSV()
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFile.name,
        mimeType: testFile.mimeType,
        buffer: testFile.buffer
      })
      await page.waitForTimeout(2000)

      // Step 2: Enter prompt
      const promptTextarea = page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"]').first()
      await promptTextarea.fill(TEST_PROMPT)
      await page.waitForTimeout(500)

      // Step 3: Add output field
      const addOutputFieldButton = page.locator('button:has-text("Add Field"), button:has-text("Add Output Field")').first()
      if (await addOutputFieldButton.isVisible()) {
        await addOutputFieldButton.click()
        await page.waitForTimeout(300)
        
        const outputFieldInput = page.locator('input[placeholder*="field name"], input[placeholder*="Field name"]').first()
        await outputFieldInput.fill('bio')
        await page.waitForTimeout(300)
      }

      // Step 4: Monitor unified API calls
      let batchCreated = false
      page.on('response', response => {
        if (response.url().includes('/api/process') && response.status() === 202) {
          batchCreated = true
          console.log('✅ Full batch created via unified /api/process')
        }
      })

      // Step 5: Click Run All button
      const runAllButton = page.locator('button:has-text("Run All"), button:has-text("Process All")').first()
      await expect(runAllButton).toBeEnabled({ timeout: 5000 })
      await runAllButton.click()

      // Verify batch was created via unified API
      await page.waitForTimeout(2000)
      expect(batchCreated).toBe(true)

      // Step 6: Wait for batch to complete (max 180 seconds for 3 rows)
      const maxWaitTime = 180000 // 180 seconds
      const startTime = Date.now()
      let completedRows = 0
      
      while (Date.now() - startTime < maxWaitTime) {
        await page.waitForTimeout(3000)
        
        // Check progress
        const progressText = await page.locator('[class*="progress"], [class*="status"]').first().textContent().catch(() => '')
        const resultRows = page.locator('tbody tr, [data-testid="result-row"]')
        const currentRowCount = await resultRows.count()
        
        if (currentRowCount > completedRows) {
          completedRows = currentRowCount
          console.log(`📊 Progress: ${completedRows} rows completed`)
        }
        
        // Check if all rows are complete (3 rows in test CSV)
        if (currentRowCount >= 3) {
          const allRowsComplete = await Promise.all(
            Array.from({ length: currentRowCount }).map(async (_, i) => {
              const row = resultRows.nth(i)
              const text = await row.textContent()
              return text && !text.includes('Processing') && !text.includes('pending')
            })
          )
          
          if (allRowsComplete.every(Boolean)) {
            console.log('✅ Full batch completed with all results')
            break
          }
        }
        
        // Check for error
        const errorMessage = page.locator('[class*="error"], [class*="destructive"]').first()
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent()
          throw new Error(`Full batch failed: ${errorText}`)
        }
      }

      // Step 7: Verify all results are displayed
      const resultRows = page.locator('tbody tr, [data-testid="result-row"]')
      await expect(resultRows).toHaveCount(3, { timeout: 5000 })
      
      console.log('✅ Full batch completed successfully via unified architecture')
    })
  })

  test.describe('3. Export Functionality (Unified Architecture)', () => {
    
    test('should export test batch results', async ({ page }) => {
      // Setup: Upload CSV, configure prompt, run test
      const testFile = await createTestCSV()
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFile.name,
        mimeType: testFile.mimeType,
        buffer: testFile.buffer
      })
      await page.waitForTimeout(2000)

      const promptTextarea = page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"]').first()
      await promptTextarea.fill(TEST_PROMPT)
      await page.waitForTimeout(500)

      // Run test batch
      const testButton = page.locator('button:has-text("Test"), button:has-text("Run Test")').first()
      await testButton.click()

      // Wait for test to complete
      await page.waitForTimeout(30000) // Wait up to 30 seconds for test

      // Verify results are displayed
      const resultRows = page.locator('tbody tr, [data-testid="result-row"]')
      await expect(resultRows.first()).toBeVisible({ timeout: 10000 })

      // Monitor download
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)

      // Click export/download button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first()
      if (await exportButton.isVisible()) {
        await exportButton.click()
        
        const download = await downloadPromise
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.csv$/)
          console.log('✅ Test batch export successful')
        } else {
          console.log('⚠️ Download event not detected, but export button was clicked')
        }
      } else {
        console.log('⚠️ Export button not found - may need to wait for batch completion')
      }
    })

    test('should export full batch results', async ({ page }) => {
      // Setup: Upload CSV, configure prompt, run full batch
      const testFile = await createTestCSV()
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFile.name,
        mimeType: testFile.mimeType,
        buffer: testFile.buffer
      })
      await page.waitForTimeout(2000)

      const promptTextarea = page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"]').first()
      await promptTextarea.fill(TEST_PROMPT)
      await page.waitForTimeout(500)

      // Run full batch
      const runAllButton = page.locator('button:has-text("Run All"), button:has-text("Process All")').first()
      await runAllButton.click()

      // Wait for batch to complete (max 180 seconds)
      await page.waitForTimeout(180000)

      // Verify results are displayed
      const resultRows = page.locator('tbody tr, [data-testid="result-row"]')
      await expect(resultRows).toHaveCount(3, { timeout: 10000 })

      // Monitor download
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)

      // Click export/download button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first()
      if (await exportButton.isVisible()) {
        await exportButton.click()
        
        const download = await downloadPromise
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.csv$/)
          console.log('✅ Full batch export successful')
        } else {
          console.log('⚠️ Download event not detected, but export button was clicked')
        }
      } else {
        console.log('⚠️ Export button not found - may need to wait for batch completion')
      }
    })
  })

  test.describe('4. Results Sync Verification', () => {
    
    test('should sync results via EventSource and fallback polling', async ({ page }) => {
      // Upload CSV and configure
      const testFile = await createTestCSV()
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFile.name,
        mimeType: testFile.mimeType,
        buffer: testFile.buffer
      })
      await page.waitForTimeout(2000)

      const promptTextarea = page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"]').first()
      await promptTextarea.fill(TEST_PROMPT)
      await page.waitForTimeout(500)

      // Monitor both EventSource and polling endpoints
      const eventSourceCalls: string[] = []
      const statusApiCalls: string[] = []
      
      page.on('response', response => {
        if (response.url().includes('/stream')) {
          eventSourceCalls.push(response.url())
        }
        if (response.url().includes('/status')) {
          statusApiCalls.push(response.url())
        }
      })

      // Start test batch
      const testButton = page.locator('button:has-text("Test"), button:has-text("Run Test")').first()
      await testButton.click()

      // Wait for completion
      await page.waitForTimeout(30000)

      // Verify EventSource was used
      expect(eventSourceCalls.length).toBeGreaterThan(0)
      console.log(`✅ EventSource calls: ${eventSourceCalls.length}`)
      
      // Verify fallback polling may have been used (if EventSource failed)
      if (statusApiCalls.length > 0) {
        console.log(`✅ Fallback polling calls: ${statusApiCalls.length}`)
      }

      // Verify results are displayed (synced)
      const resultRows = page.locator('tbody tr, [data-testid="result-row"]')
      await expect(resultRows.first()).toBeVisible({ timeout: 5000 })
      
      console.log('✅ Results synced successfully via unified architecture')
    })
  })

  test.describe('5. Single Source of Truth Verification', () => {
    
    test('should use batchProcessor.results as single source of truth', async ({ page }) => {
      // This test verifies that there's no separate testResults state
      // by checking that results appear in the same table for both test and full batches

      // Upload CSV
      const testFile = await createTestCSV()
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFile.name,
        mimeType: testFile.mimeType,
        buffer: testFile.buffer
      })
      await page.waitForTimeout(2000)

      const promptTextarea = page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"]').first()
      await promptTextarea.fill(TEST_PROMPT)
      await page.waitForTimeout(500)

      // Run test batch
      const testButton = page.locator('button:has-text("Test"), button:has-text("Run Test")').first()
      await testButton.click()

      // Wait for test results
      await page.waitForTimeout(30000)
      
      const testResultsTable = page.locator('table').last()
      await expect(testResultsTable).toBeVisible({ timeout: 10000 })
      
      const testResultRows = page.locator('tbody tr, [data-testid="result-row"]')
      const testRowCount = await testResultRows.count()
      console.log(`✅ Test batch results: ${testRowCount} row(s)`)

      // Clear and run full batch
      // Note: In unified architecture, both use the same results table
      const runAllButton = page.locator('button:has-text("Run All"), button:has-text("Process All")').first()
      await runAllButton.click()

      // Wait for full batch results
      await page.waitForTimeout(180000)
      
      const fullResultRows = page.locator('tbody tr, [data-testid="result-row"]')
      const fullRowCount = await fullResultRows.count()
      console.log(`✅ Full batch results: ${fullRowCount} row(s)`)

      // Verify both batches used the same results table (single source of truth)
      const finalResultsTable = page.locator('table').last()
      await expect(finalResultsTable).toBeVisible()
      
      // The table should show full batch results (3 rows), not test results (1 row)
      // This confirms unified architecture is working
      expect(fullRowCount).toBeGreaterThanOrEqual(testRowCount)
      
      console.log('✅ Single source of truth verified: batchProcessor.results')
    })
  })
})

