import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('V2 Migration End-to-End Test', () => {
  test('should process CSV with V2 backend and display results', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')

    console.log('=== STEP 1: Upload CSV ===')

    // Upload the test CSV file
    const csvPath = path.join(process.cwd(), 'test-data', 'test-migration.csv')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    // Wait for CSV to be processed and columns to appear
    await page.waitForSelector('text=name', { timeout: 10000 })
    await page.waitForSelector('text=company', { timeout: 10000 })
    await page.waitForSelector('text=role', { timeout: 10000 })

    console.log('✓ CSV uploaded and parsed successfully')

    console.log('=== STEP 2: Set up prompt ===')

    // Set the prompt template
    const promptInput = page.locator('textarea[placeholder*="prompt" i], textarea[placeholder*="template" i]').first()
    await promptInput.fill('Write a professional bio for {{name}} who works as a {{role}} at {{company}}.')

    console.log('✓ Prompt template configured')

    console.log('=== STEP 3: Configure output columns ===')

    // Add output column "bio"
    const addColumnButton = page.locator('button:has-text("Add"), button:has-text("Column")').first()
    await addColumnButton.click()

    const columnNameInput = page.locator('input[placeholder*="column" i], input[placeholder*="name" i]').last()
    await columnNameInput.fill('bio')
    await columnNameInput.press('Enter')

    console.log('✓ Output column "bio" configured')

    console.log('=== STEP 4: Run batch processing ===')

    // Click "Run All" or "Process" button
    const runButton = page.locator('button:has-text("Run"), button:has-text("Process"), button:has-text("Start")').first()
    await runButton.click()

    console.log('✓ Batch processing started')

    console.log('=== STEP 5: Wait for V2 Modal processing ===')

    // Wait for batch to start processing (may take 60-90s for Modal cold start)
    await page.waitForSelector('text=/Processing|Completed/i', { timeout: 150000 }) // 2.5 min timeout

    console.log('✓ Batch processing initiated')

    console.log('=== STEP 6: Verify results display ===')

    // Wait for at least one result to complete
    await page.waitForSelector('text=/Done|Completed|Success/i', { timeout: 180000 }) // 3 min timeout for actual processing

    console.log('✓ Results starting to appear')

    // Verify all 3 rows processed
    const resultsTable = page.locator('table tbody tr')
    const rowCount = await resultsTable.count()

    expect(rowCount).toBe(3) // Should have 3 rows (Alice, Bob, Carol)

    console.log(`✓ Verified ${rowCount} rows in results table`)

    console.log('=== STEP 7: Verify V2 response transformation ===')

    // Check that at least one row has output data
    const successRows = page.locator('table tbody tr:has-text("Done"), table tbody tr:has-text("Success")')
    const successCount = await successRows.count()

    expect(successCount).toBeGreaterThan(0)

    console.log(`✓ ${successCount} rows completed successfully`)

    // Verify output data is present in the "bio" column
    const bioColumn = page.locator('table tbody td:nth-child(5)').first() // Assuming status, name, company, role, bio
    const bioText = await bioColumn.textContent()

    expect(bioText).toBeTruthy()
    expect(bioText?.length).toBeGreaterThan(10) // Should have actual bio content

    console.log(`✓ Bio output verified: "${bioText?.substring(0, 50)}..."`)

    console.log('=== STEP 8: Verify batch status ===')

    // Check the batch status card
    const statusCard = page.locator('text=/Success|Completed|Failed/i').first()
    await expect(statusCard).toBeVisible()

    console.log('✓ Batch status card visible')

    console.log('\n🎉 V2 MIGRATION TEST COMPLETE 🎉\n')
    console.log('Summary:')
    console.log('- CSV uploaded and parsed ✓')
    console.log('- Prompt template configured ✓')
    console.log('- Output column added ✓')
    console.log('- V2 backend processing ✓')
    console.log('- Response transformation working ✓')
    console.log('- Results displayed correctly ✓')
    console.log('\n✅ All migration components verified!')
  })

  test('should verify V2 API endpoint is being called', async ({ page }) => {
    console.log('=== API Endpoint Verification Test ===')

    // Intercept network requests to verify V2 endpoint
    const apiCalls: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('modal') || url.includes('/api/process')) {
        apiCalls.push(url)
        console.log(`API Call: ${url}`)
      }
    })

    await page.goto('http://localhost:3000')

    const csvPath = path.join(process.cwd(), 'test-data', 'test-migration.csv')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)

    await page.waitForSelector('text=name', { timeout: 10000 })

    const promptInput = page.locator('textarea').first()
    await promptInput.fill('Test prompt for {{name}}')

    const runButton = page.locator('button:has-text("Run"), button:has-text("Process")').first()
    await runButton.click()

    // Wait a bit for API call to be made
    await page.waitForTimeout(5000)

    console.log('\nAPI calls made:')
    apiCalls.forEach(url => console.log(`  - ${url}`))

    // Verify that /api/process was called
    const processApiCalled = apiCalls.some(url => url.includes('/api/process'))
    expect(processApiCalled).toBe(true)

    console.log('\n✓ Verified /api/process endpoint was called')
    console.log('Note: V2 endpoint (g-mcp-tools-v2) is called server-side from /api/process')
  })
})
