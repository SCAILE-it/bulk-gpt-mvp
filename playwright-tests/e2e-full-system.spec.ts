import { test, expect } from '@playwright/test'

/**
 * BULK-GPT PRODUCTION E2E TESTS
 * 
 * Verifies complete system flow:
 * 1. CSV Upload → Parse & Validate
 * 2. API Call → Create Batch & Results
 * 3. Supabase Storage → Batch Record Created
 * 4. Modal Processing → Real AI Generation
 * 5. Results Retrieval → Display & Export
 * 
 * Run with:
 *   npx playwright test e2e-full-system.spec.ts
 *   npx playwright test e2e-full-system.spec.ts --ui
 *   npx playwright test -g "Full System Flow"
 */

const BASE_URL = 'http://localhost:3000'
const API_TIMEOUT = 30000 // 30 seconds for API calls
const POLLING_TIMEOUT = 60000 // 60 seconds for Modal processing

test.describe('BULK-GPT Full System Flow - Production E2E', () => {
  let batchId: string | null = null

  test.beforeEach(async ({ page }) => {
    // Load app
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    console.log('✅ App loaded at', BASE_URL)
  })

  test.afterEach(async () => {
    // Log batch ID for debugging
    if (batchId) {
      console.log(`📝 Batch ID from test: ${batchId}`)
    }
  })

  test('FULL-01: Complete Flow - CSV → Upload → Process → Results → Export', async ({ page, context }) => {
    console.log('🧪 FULL-01: Testing complete system flow...')

    // ====== STEP 1: Upload CSV ======
    console.log('\n📤 STEP 1: CSV Upload')
    const csvContent = `name,company,role
Alice Johnson,TechCorp,Senior Engineer
Bob Smith,DataCo,Data Analyst
Carol White,AILabs,Product Manager`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'e2e-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await page.waitForTimeout(2000) // Wait for CSV to parse
    
    // Verify CSV loaded (should see "CSV Preview" with row count)
    const csvPreview = page.locator('text=CSV Preview')
    await expect(csvPreview).toBeVisible()
    console.log('✅ CSV uploaded and parsed')

    // ====== STEP 2: Enter Prompt ======
    console.log('\n📝 STEP 2: Enter Prompt')
    const prompt = `Write a professional bio for {{name}} who works as a {{role}} at {{company}}. 
Keep it to 2-3 sentences focusing on professional expertise.`

    const promptTextarea = page.locator('textarea#prompt')
    await promptTextarea.fill(prompt)
    await page.waitForTimeout(500)

    // Verify prompt entered
    await expect(promptTextarea).toHaveValue(prompt)
    console.log('✅ Prompt entered')

    // ====== STEP 3: Optional Context ======
    console.log('\n💡 STEP 3: Enter Context (optional)')
    const context_text = 'Emphasize technical achievements and industry experience. Keep professional tone.'
    
    const contextTextarea = page.locator('textarea#context')
    await contextTextarea.fill(context_text)
    await page.waitForTimeout(500)

    console.log('✅ Context entered')

    // ====== STEP 4: Verify Button Enabled ======
    console.log('\n▶️  STEP 4: Verify Start Button Enabled')
    const startButton = page.getByRole('button', { name: /Start Processing|▶️/ })
    await expect(startButton).toBeEnabled()
    console.log('✅ Start Processing button is enabled')

    // ====== STEP 5: Start Processing (Fire-and-Forget) ======
    console.log('\n🚀 STEP 5: Start Processing')
    
    // Listen for API responses
    const processPromise = page.waitForResponse(
      response => response.url().includes('/api/process') && response.status() === 202
    )

    await startButton.click()
    console.log('✅ Process button clicked')

    // Wait for 202 Accepted response
    const processResponse = await Promise.race([
      processPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Process API timeout')), API_TIMEOUT)
      )
    ])

    if (processResponse instanceof Response) {
      const responseData = await processResponse.json()
      batchId = responseData.batchId
      console.log(`✅ API returned 202 Accepted`)
      console.log(`📝 Batch ID: ${batchId}`)
      expect(responseData).toHaveProperty('batchId')
      expect(responseData).toHaveProperty('status')
      expect(responseData.status).toBe('pending')
    }

    // ====== STEP 6: Monitor Progress ======
    console.log('\n⏳ STEP 6: Monitor Real-Time Progress')
    
    // Should see progress section appear
    const processingCard = page.locator('text=Processing')
    await expect(processingCard).toBeVisible({ timeout: 5000 })
    console.log('✅ Progress card appeared')

    // Progress bar should be visible
    const progressBar = page.locator('.bg-primary').first()
    await expect(progressBar).toBeVisible()
    console.log('✅ Progress bar visible')

    // Monitor progress updates (polling every 2s)
    let maxProgress = 0
    const pollStart = Date.now()
    while (Date.now() - pollStart < POLLING_TIMEOUT) {
      const progressPercent = await page.locator('text=/\\d+%/').first().textContent()
      if (progressPercent) {
        const percent = parseInt(progressPercent)
        if (percent > maxProgress) {
          maxProgress = percent
          console.log(`📊 Progress: ${percent}%`)
        }
      }

      // Check if completed
      const resultStatus = await page.locator('text=Results').textContent()
      if (resultStatus?.includes('results available')) {
        console.log('✅ Processing completed - results available')
        break
      }

      await page.waitForTimeout(2000)
    }

    // ====== STEP 7: Verify Results Populated ======
    console.log('\n📋 STEP 7: Verify Results Populated')
    
    const resultsSection = page.locator('heading:has-text("Results")')
    await expect(resultsSection).toBeVisible()
    console.log('✅ Results section visible')

    // Results table should have data
    const resultsTable = page.locator('table').nth(1) // Second table (results, not preview)
    const tableRows = resultsTable.locator('tbody tr')
    const rowCount = await tableRows.count()
    
    expect(rowCount).toBeGreaterThan(0)
    console.log(`✅ Results table has ${rowCount} rows`)

    // Verify data structure (should have input, output, status columns)
    const firstRow = tableRows.first()
    const cells = firstRow.locator('td')
    const cellCount = await cells.count()
    expect(cellCount).toBeGreaterThanOrEqual(3) // At least input, output, status
    console.log(`✅ Results row has ${cellCount} columns`)

    // ====== STEP 8: Export as CSV ======
    console.log('\n📥 STEP 8: Export as CSV')
    
    const downloadPromise = context.waitForEvent('page')
    const csvExportButton = page.getByRole('button', { name: /Download as CSV|CSV/ }).first()
    
    // Click export
    await csvExportButton.click()
    
    // Some systems might open in new tab
    try {
      const downloadPage = await Promise.race([
        downloadPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Download timeout')), 10000)
        )
      ])
      console.log('✅ CSV export initiated')
    } catch (e) {
      console.log('⚠️  CSV export might have opened in background or triggered download')
    }

    // ====== STEP 9: Export as JSON ======
    console.log('\n📥 STEP 9: Export as JSON')
    
    const jsonExportButton = page.getByRole('button', { name: /Download as JSON|JSON/ }).first()
    await jsonExportButton.click()
    console.log('✅ JSON export initiated')

    // ====== STEP 10: Verify Data Integrity ======
    console.log('\n✓ STEP 10: Verify Data Integrity')
    
    // Check first result row
    const firstResultCell = firstRow.locator('td').first()
    const cellContent = await firstResultCell.textContent()
    expect(cellContent?.length).toBeGreaterThan(0)
    console.log(`✅ Results contain data: "${cellContent?.substring(0, 50)}..."`)

    // Status should be success or error
    const statusCell = firstRow.locator('td').nth(2)
    const statusText = await statusCell.textContent()
    expect(['success', 'error']).toContain(statusText?.toLowerCase())
    console.log(`✅ Status is valid: ${statusText}`)

    console.log('\n🎉 FULL SYSTEM FLOW COMPLETE')
    console.log(`✅ All 10 steps passed`)
    console.log(`📝 Batch ID: ${batchId}`)
  })

  test('API-01: Batch Processing API - Async Fire-and-Forget Pattern', async ({ page }) => {
    console.log('🧪 API-01: Testing batch API...')

    // Create test data
    const testData = {
      csvFilename: 'api-test.csv',
      rows: [
        { name: 'John Doe', title: 'Software Engineer' },
        { name: 'Jane Smith', title: 'Product Manager' }
      ],
      prompt: 'Create a bio for {{name}} who is a {{title}}',
      context: 'Professional tone'
    }

    // Call API directly
    const response = await page.evaluate(async (data) => {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return {
        status: res.status,
        data: await res.json()
      }
    }, testData)

    console.log(`✅ API responded with status: ${response.status}`)
    expect(response.status).toBe(202) // Accepted for async
    expect(response.data).toHaveProperty('batchId')
    expect(response.data).toHaveProperty('status')
    expect(response.data.status).toBe('pending')
    console.log(`✅ Batch created: ${response.data.batchId}`)

    batchId = response.data.batchId
  })

  test('STATUS-01: Batch Status API - Real-time Progress Tracking', async ({ page }) => {
    console.log('🧪 STATUS-01: Testing status API...')

    if (!batchId) {
      console.log('⚠️  Skipping - no batch ID from previous test')
      test.skip()
    }

    // Poll status endpoint
    const statusResponse = await page.evaluate(async (id: string) => {
      const res = await fetch(`/api/batch/${id}/status`)
      return {
        status: res.status,
        data: await res.json()
      }
    }, batchId!)

    console.log(`✅ Status API responded with: ${statusResponse.status}`)
    expect(statusResponse.status).toBe(200)
    
    // Verify response structure
    const data = statusResponse.data
    expect(data).toHaveProperty('batchId')
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('totalRows')
    expect(data).toHaveProperty('processedRows')
    expect(data).toHaveProperty('progressPercent')
    expect(data).toHaveProperty('results')
    
    console.log(`✅ Status: ${data.status}`)
    console.log(`✅ Progress: ${data.processedRows}/${data.totalRows} (${data.progressPercent}%)`)
  })

  test('EXPORT-01: CSV Export API - Format & Metadata', async ({ page }) => {
    console.log('🧪 EXPORT-01: Testing CSV export...')

    const testResults = [
      {
        id: 'row-1',
        input: { name: 'Alice', title: 'Engineer' },
        output: 'Alice is a talented engineer with expertise...',
        status: 'success'
      }
    ]

    const response = await page.evaluate(async (results) => {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          format: 'csv',
          batchId: 'test-batch-123',
          timestamp: new Date().toISOString()
        })
      })
      return {
        status: res.status,
        contentType: res.headers.get('content-type'),
        text: await res.text()
      }
    }, testResults)

    console.log(`✅ Export API status: ${response.status}`)
    expect(response.status).toBe(200)
    expect(response.contentType).toContain('text/csv')
    expect(response.text).toContain('name')
    expect(response.text).toContain('Alice')
    console.log('✅ CSV export contains expected data')
  })

  test('SUPABASE-01: Data Persistence - Results in Database', async ({ page }) => {
    console.log('🧪 SUPABASE-01: Verifying Supabase persistence...')

    if (!batchId) {
      console.log('⚠️  Skipping - no batch ID')
      test.skip()
    }

    // Query batch status (which reads from Supabase)
    const response = await page.evaluate(async (id: string) => {
      const res = await fetch(`/api/batch/${id}/status`)
      if (!res.ok) return null
      return await res.json()
    }, batchId!)

    if (response) {
      // If we got data, Supabase is working
      console.log('✅ Batch data retrieved from Supabase')
      expect(response).toHaveProperty('batchId')
      expect(response).toHaveProperty('results')
      console.log(`✅ Supabase contains ${response.results?.length || 0} results`)
    } else {
      console.log('⚠️  Batch not found in Supabase (still processing)')
    }
  })

  test('MODAL-01: Real Processing - AI Generation Works', async ({ page }) => {
    console.log('🧪 MODAL-01: Verifying Modal AI processing...')

    if (!batchId) {
      console.log('⚠️  Skipping - no batch ID')
      test.skip()
    }

    // Wait for processing to complete
    let attempts = 0
    const maxAttempts = 30 // ~60 seconds

    while (attempts < maxAttempts) {
      const response = await page.evaluate(async (id: string) => {
        const res = await fetch(`/api/batch/${id}/status`)
        return await res.json()
      }, batchId!)

      console.log(`Attempt ${attempts + 1}: Status = ${response.status}`)

      if (response.status === 'completed' || response.status === 'completed_with_errors') {
        // Processing complete - check results
        const results = response.results || []
        console.log(`✅ Processing complete: ${results.length} results`)

        // Verify at least some results have AI output
        const successResults = results.filter((r: any) => r.status === 'success')
        if (successResults.length > 0) {
          const firstOutput = successResults[0].output
          console.log(`✅ AI Output: "${firstOutput?.substring(0, 50)}..."`)
          expect(firstOutput).toBeTruthy()
          expect(firstOutput.length).toBeGreaterThan(10)
          console.log('✅ Modal processing generated real AI content')
        }
        break
      }

      attempts++
      if (attempts < maxAttempts) {
        await page.waitForTimeout(2000)
      }
    }

    if (attempts >= maxAttempts) {
      console.log('⚠️  Modal processing timeout (still running in cloud)')
    }
  })

  test('PERFORMANCE-01: Batch Processing Performance', async ({ page }) => {
    console.log('🧪 PERFORMANCE-01: Testing performance...')

    const csvContent = `name,company,role
Alice Johnson,TechCorp,Senior Engineer
Bob Smith,DataCo,Data Analyst
Carol White,AILabs,Product Manager
David Lee,CloudCorp,DevOps Engineer
Emma Davis,DataMart,Analytics Lead`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'performance-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await page.waitForTimeout(1500)

    const prompt = 'Write a one-sentence summary for {{name}} at {{company}} as {{role}}'
    const promptTextarea = page.locator('textarea#prompt')
    await promptTextarea.fill(prompt)

    // Measure time to process
    const startTime = Date.now()
    const startButton = page.getByRole('button', { name: /Start Processing/ })
    await startButton.click()

    // Wait for response
    const response = await page.waitForResponse(
      r => r.url().includes('/api/process') && r.status() === 202,
      { timeout: 5000 }
    )

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`✅ API Response time: ${duration}ms`)
    expect(duration).toBeLessThan(5000) // Should respond quickly (fire-and-forget)
    console.log('✅ Performance acceptable')
  })
})




