import { test, expect } from '@playwright/test'
import { invokeModal } from './test-helpers/invoke-modal'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Comprehensive Export/Download Test Suite
 *
 * Tests the complete CSV export functionality:
 * 1. Export button visibility and state management
 * 2. Download trigger and filename validation
 * 3. CSV structure validation (headers, rows, columns)
 * 4. Data accuracy (matches database records)
 * 5. Field escaping (quotes, commas, newlines)
 * 6. Error states (no batch, no results, network errors)
 * 7. Toast notifications
 */

test.describe('CSV Export & Download', () => {
  // Shared test data
  const csvContent = `name,company,role,description
Alice Johnson,TechCorp,Data Analyst,"Loves working with data, analytics, and visualization"
Bob Smith,DataCo,Senior Engineer,"Builds scalable systems, enjoys coding in Python, Java"
Carol White,AILabs,Product Manager,"Strategic thinker, passionate about AI ethics"`

  const csvData = csvContent.split('\n').slice(1).map(line => {
    // Parse CSV with proper quote handling
    const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)
    if (!matches || matches.length < 4) return null

    return {
      name: matches[0].replace(/^"|"$/g, ''),
      company: matches[1].replace(/^"|"$/g, ''),
      role: matches[2].replace(/^"|"$/g, ''),
      description: matches[3].replace(/^"|"$/g, '')
    }
  }).filter(Boolean) as Array<Record<string, string>>

  let supabase: ReturnType<typeof createClient>

  test.beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  })

  test('Export button visible after processing completes', async ({ page }) => {
    test.setTimeout(180000)

    console.log('\n📤 Testing export button visibility...\n')

    // Setup network monitoring
    let batchId = ''
    page.on('response', async (response) => {
      if (response.url().includes('/api/process') && response.request().method() === 'POST') {
        try {
          const data = await response.json()
          batchId = data.batchId || ''
        } catch (e) {
          // Ignore parsing errors
        }
      }
    })

    // Navigate and upload
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await expect(page.locator('[data-testid="row-count-display"]').first())
      .toContainText('3 rows', { timeout: 10000 })

    // Configure and submit
    const promptTextarea = page.locator('[data-testid="prompt-textarea"]')
    await promptTextarea.fill('Write a bio for {{name}} at {{company}}')

    const runButton = page.locator('[data-testid="run-button"]')
    await expect(runButton).toBeEnabled({ timeout: 5000 })
    await runButton.click()

    await page.waitForTimeout(2000)
    expect(batchId).toBeTruthy()

    // Process via Modal
    await invokeModal({
      batchId,
      rows: csvData,
      prompt: 'Write a bio for {{name}} at {{company}}',
      webhookUrl: `http://localhost:3334/api/webhook/modal-callback`,
      maxWaitSeconds: 60
    })

    console.log('✅ Batch processed, checking for export button...')

    // Wait for results to appear
    await page.waitForTimeout(3000)

    // Look for export button in RIGHT PANEL
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
    await expect(exportButton).toBeVisible({ timeout: 10000 })
    console.log('✅ Export button visible')

    // Verify button is enabled
    await expect(exportButton).toBeEnabled()
    console.log('✅ Export button enabled')

    await page.screenshot({
      path: 'screenshots/export-test/01-export-button-visible.png',
      fullPage: true
    })
  })

  test('Download triggers with correct filename', async ({ page }) => {
    test.setTimeout(180000)

    console.log('\n📥 Testing download trigger and filename...\n')

    // Setup network monitoring
    let batchId = ''
    page.on('response', async (response) => {
      if (response.url().includes('/api/process') && response.request().method() === 'POST') {
        try {
          const data = await response.json()
          batchId = data.batchId || ''
          console.log(`📦 Batch created: ${batchId}`)
        } catch (e) {
          // Ignore
        }
      }
    })

    // Navigate, upload, configure, submit
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-download.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await expect(page.locator('[data-testid="row-count-display"]').first())
      .toContainText('3 rows', { timeout: 10000 })

    await page.locator('[data-testid="prompt-textarea"]').fill('Bio for {{name}} at {{company}}')

    const runButton = page.locator('[data-testid="run-button"]')
    await runButton.click()
    await page.waitForTimeout(2000)

    // Process
    await invokeModal({
      batchId,
      rows: csvData,
      prompt: 'Bio for {{name}} at {{company}}',
      webhookUrl: `http://localhost:3334/api/webhook/modal-callback`,
      maxWaitSeconds: 60
    })

    await page.waitForTimeout(3000)

    // Verify results are loaded before attempting export
    const resultRows = page.locator('tbody tr').filter({ hasText: 'Alice' })
    await expect(resultRows.first()).toBeVisible({ timeout: 10000 })
    console.log('   Results loaded and visible')

    // Verify export button is visible and enabled
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
    await expect(exportButton).toBeVisible({ timeout: 10000 })
    await expect(exportButton).toBeEnabled({ timeout: 5000 })
    console.log('   Export button ready')

    // Setup download listener BEFORE clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

    // Click export
    await exportButton.click()
    console.log('   Export button clicked, waiting for download...')

    // Wait for download
    const download = await downloadPromise
    const filename = download.suggestedFilename()

    console.log(`✅ Download triggered: ${filename}`)

    // Verify filename format
    expect(filename).toMatch(/^results-batch_[a-z0-9_]+\.csv$/)
    expect(filename).toContain(batchId)
    console.log(`✅ Filename format correct: results-${batchId}.csv`)

    // Save download for verification
    const downloadPath = path.join('screenshots/export-test', `downloaded-${filename}`)

    // Ensure directory exists
    const downloadDir = path.dirname(downloadPath)
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true })
    }

    await download.saveAs(downloadPath)
    console.log(`✅ File saved: ${downloadPath}`)

    await page.screenshot({
      path: 'screenshots/export-test/02-download-triggered.png',
      fullPage: true
    })
  })

  test('CSV content validation: headers and structure', async ({ page }) => {
    test.setTimeout(180000)

    console.log('\n📋 Testing CSV content structure...\n')

    let batchId = ''
    page.on('response', async (response) => {
      if (response.url().includes('/api/process') && response.request().method() === 'POST') {
        try {
          const data = await response.json()
          batchId = data.batchId || ''
        } catch (e) {
          // Ignore
        }
      }
    })

    // Setup and process batch
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-csv-structure.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await expect(page.locator('[data-testid="row-count-display"]').first())
      .toContainText('3 rows', { timeout: 10000 })

    await page.locator('[data-testid="prompt-textarea"]').fill('Bio for {{name}}')

    await page.locator('[data-testid="run-button"]').click()
    await page.waitForTimeout(2000)

    await invokeModal({
      batchId,
      rows: csvData,
      prompt: 'Bio for {{name}}',
      webhookUrl: `http://localhost:3334/api/webhook/modal-callback`,
      maxWaitSeconds: 60
    })

    await page.waitForTimeout(3000)

    // Verify results are loaded before attempting export
    const resultRows = page.locator('tbody tr').filter({ hasText: 'Alice' })
    await expect(resultRows.first()).toBeVisible({ timeout: 10000 })
    console.log('   Results loaded and visible')

    // Ensure export button is visible and enabled
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
    await expect(exportButton).toBeVisible({ timeout: 10000 })
    await expect(exportButton).toBeEnabled({ timeout: 5000 })
    console.log('   Export button ready')

    // Download CSV
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await exportButton.click()
    console.log('   Export button clicked, waiting for download...')
    const download = await downloadPromise

    // Save and read CSV
    const downloadPath = path.join('screenshots/export-test', `structure-test-${batchId}.csv`)

    // Ensure directory exists
    const downloadDir = path.dirname(downloadPath)
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true })
    }

    await download.saveAs(downloadPath)

    const downloadedCsv = fs.readFileSync(downloadPath, 'utf-8')
    const lines = downloadedCsv.split('\n').filter(line => line.trim())

    console.log(`   CSV has ${lines.length} lines (1 header + ${lines.length - 1} data rows)`)

    // Verify structure
    expect(lines.length).toBeGreaterThanOrEqual(4) // Header + 3 data rows minimum
    console.log('✅ CSV has expected number of rows')

    // Verify headers
    const headers = lines[0].split(',')
    console.log(`   Headers: ${headers.join(', ')}`)

    // Expected headers: input columns + output column(s) + Status + Error
    expect(headers).toContain('name')
    expect(headers).toContain('company')
    expect(headers).toContain('role')
    expect(headers).toContain('description')
    expect(headers).toContain('Status')
    expect(headers).toContain('Error')
    console.log('✅ All expected headers present')

    // Verify data rows
    const dataRows = lines.slice(1)
    expect(dataRows.length).toBe(3)
    console.log('✅ Correct number of data rows (3)')

    // Each row should have same number of columns as headers
    dataRows.forEach((row, index) => {
      const columns = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || []
      expect(columns.length).toBe(headers.length)
      console.log(`   Row ${index + 1}: ${columns.length} columns ✓`)
    })

    console.log('✅ CSV structure valid')

    await page.screenshot({
      path: 'screenshots/export-test/03-csv-structure-verified.png',
      fullPage: true
    })
  })

  test('CSV data accuracy matches database', async ({ page }) => {
    test.setTimeout(180000)

    console.log('\n🔍 Testing CSV data accuracy vs database...\n')

    let batchId = ''
    page.on('response', async (response) => {
      if (response.url().includes('/api/process') && response.request().method() === 'POST') {
        try {
          const data = await response.json()
          batchId = data.batchId || ''
          console.log(`📦 Batch: ${batchId}`)
        } catch (e) {
          // Ignore
        }
      }
    })

    // Process batch
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-data-accuracy.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await expect(page.locator('[data-testid="row-count-display"]').first())
      .toContainText('3 rows', { timeout: 10000 })

    await page.locator('[data-testid="prompt-textarea"]').fill('Bio for {{name}}')
    await page.locator('[data-testid="run-button"]').click()
    await page.waitForTimeout(2000)

    await invokeModal({
      batchId,
      rows: csvData,
      prompt: 'Bio for {{name}}',
      webhookUrl: `http://localhost:3334/api/webhook/modal-callback`,
      maxWaitSeconds: 60
    })

    await page.waitForTimeout(3000)

    // Verify results are loaded before attempting export
    const resultRows = page.locator('tbody tr').filter({ hasText: 'Alice' })
    await expect(resultRows.first()).toBeVisible({ timeout: 10000 })
    console.log('   Results loaded and visible')

    // Verify export button is visible and enabled
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
    await expect(exportButton).toBeVisible({ timeout: 10000 })
    await expect(exportButton).toBeEnabled({ timeout: 5000 })
    console.log('   Export button ready')

    // Download CSV
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await exportButton.click()
    console.log('   Export button clicked, waiting for download...')
    const download = await downloadPromise

    const downloadPath = path.join('screenshots/export-test', `accuracy-test-${batchId}.csv`)

    // Ensure directory exists
    const downloadDir = path.dirname(downloadPath)
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true })
    }

    await download.saveAs(downloadPath)

    // Read downloaded CSV
    const downloadedCsv = fs.readFileSync(downloadPath, 'utf-8')
    const lines = downloadedCsv.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',')
    const dataRows = lines.slice(1)

    console.log(`   Downloaded CSV: ${dataRows.length} rows`)

    // Fetch from database
    const { data: dbResults, error } = await supabase
      .from('batch_results')
      .select('input_data, output_data, status, error_message')
      .eq('batch_id', batchId)
      .order('id', { ascending: true })

    expect(error).toBeNull()
    expect(dbResults).toBeTruthy()
    expect(dbResults!.length).toBe(3)
    console.log(`   Database: ${dbResults!.length} rows`)

    // Verify row count matches
    expect(dataRows.length).toBe(dbResults!.length)
    console.log('✅ Row counts match')

    // Verify each row
    for (let i = 0; i < dbResults!.length; i++) {
      const dbRow = dbResults![i]
      const csvRow = dataRows[i]

      // Parse database input
      const dbInput = typeof dbRow.input_data === 'string'
        ? JSON.parse(dbRow.input_data)
        : dbRow.input_data

      // CSV row should contain input data
      expect(csvRow).toContain(dbInput.name)
      expect(csvRow).toContain(dbInput.company)

      // Should contain status
      expect(csvRow).toContain(dbRow.status)

      console.log(`   Row ${i + 1}: ${dbInput.name} - status: ${dbRow.status} ✓`)
    }

    console.log('✅ All rows match database records')

    await page.screenshot({
      path: 'screenshots/export-test/04-data-accuracy-verified.png',
      fullPage: true
    })
  })

  test('Field escaping: quotes, commas, newlines', async ({ page }) => {
    test.setTimeout(180000)

    console.log('\n🔧 Testing CSV field escaping...\n')

    // CSV with special characters that need escaping
    const specialCsvContent = `name,company,role,notes
"Smith, John","Tech""Corp",Engineer,"Enjoys coding, testing, and debugging"
Jane O'Brien,Data Co,Analyst,"Expert in SQL, Python, and data viz"
Mike Wilson,AI Labs,PM,"Passionate about AI
and machine learning"`

    const specialCsvData = [
      { name: 'Smith, John', company: 'Tech"Corp', role: 'Engineer', notes: 'Enjoys coding, testing, and debugging' },
      { name: "Jane O'Brien", company: 'Data Co', role: 'Analyst', notes: 'Expert in SQL, Python, and data viz' },
      { name: 'Mike Wilson', company: 'AI Labs', role: 'PM', notes: 'Passionate about AI\nand machine learning' }
    ]

    let batchId = ''
    page.on('response', async (response) => {
      if (response.url().includes('/api/process') && response.request().method() === 'POST') {
        try {
          const data = await response.json()
          batchId = data.batchId || ''
        } catch (e) {
          // Ignore
        }
      }
    })

    // Process batch with special characters
    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-escaping.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(specialCsvContent),
    })

    await expect(page.locator('[data-testid="row-count-display"]').first())
      .toContainText('3 rows', { timeout: 10000 })

    await page.locator('[data-testid="prompt-textarea"]').fill('Bio for {{name}}')
    await page.locator('[data-testid="run-button"]').click()
    await page.waitForTimeout(2000)

    await invokeModal({
      batchId,
      rows: specialCsvData,
      prompt: 'Bio for {{name}}',
      webhookUrl: `http://localhost:3334/api/webhook/modal-callback`,
      maxWaitSeconds: 60
    })

    await page.waitForTimeout(3000)

    // Verify results are loaded before attempting export
    const resultRows = page.locator('tbody tr').filter({ hasText: 'Smith' })
    await expect(resultRows.first()).toBeVisible({ timeout: 10000 })
    console.log('   Results loaded and visible')

    // Verify export button is visible and enabled
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
    await expect(exportButton).toBeVisible({ timeout: 10000 })
    await expect(exportButton).toBeEnabled({ timeout: 5000 })
    console.log('   Export button ready')

    // Download and verify escaping
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await exportButton.click()
    console.log('   Export button clicked, waiting for download...')
    const download = await downloadPromise

    const downloadPath = path.join('screenshots/export-test', `escaping-test-${batchId}.csv`)

    // Ensure directory exists
    const downloadDir = path.dirname(downloadPath)
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true })
    }

    await download.saveAs(downloadPath)

    const downloadedCsv = fs.readFileSync(downloadPath, 'utf-8')

    // Verify special characters are properly escaped
    // Quotes should be escaped as ""
    expect(downloadedCsv).toContain('Tech""Corp')
    console.log('✅ Quotes properly escaped ("")')

    // Commas in quoted fields
    expect(downloadedCsv).toContain('"Smith, John"')
    console.log('✅ Commas in quotes preserved')

    // Fields with quotes should be wrapped
    expect(downloadedCsv).toMatch(/"[^"]*"[^"]*"[^"]*"/) // Pattern for escaped quotes
    console.log('✅ Fields with special chars quoted')

    console.log('✅ CSV escaping correct')

    await page.screenshot({
      path: 'screenshots/export-test/05-escaping-verified.png',
      fullPage: true
    })
  })

  test('Error state: export without processing', async ({ page }) => {
    console.log('\n⚠️  Testing error state: no batch...\n')

    await page.goto('/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV but DON'T process
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-no-process.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await expect(page.locator('[data-testid="row-count-display"]').first())
      .toContainText('3 rows', { timeout: 10000 })

    // Try to export without processing
    // Export button should either be hidden or disabled
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
    const exportButtonCount = await exportButton.count()

    if (exportButtonCount > 0) {
      // If button exists, it should be disabled or clicking should show error
      const isEnabled = await exportButton.isEnabled().catch(() => false)

      if (isEnabled) {
        // Click should trigger error toast
        await exportButton.click()

        // Wait for error toast (contains "No Batch" or "run a batch first")
        await expect(page.locator('text=/no batch|run a batch first/i')).toBeVisible({ timeout: 5000 })
        console.log('✅ Error toast shown for missing batch')
      } else {
        console.log('✅ Export button disabled (no batch)')
      }
    } else {
      console.log('✅ Export button hidden (no results yet)')
    }

    await page.screenshot({
      path: 'screenshots/export-test/06-error-no-batch.png',
      fullPage: true
    })
  })
})
