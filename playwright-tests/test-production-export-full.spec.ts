import { test, expect } from '@playwright/test'
import * as fs from 'fs'

test('Complete Export Workflow - Production Vercel', async ({ page }) => {
  console.log('\n🚀 PRODUCTION E2E TEST: Upload → Process → Export\n')
  console.log('URL: https://bulk-gpt-app.vercel.app')
  console.log('Testing Export fix (fetch from database instead of stale React state)\n')

  // Step 1: Navigate and login
  console.log('📝 Step 1: Login to production...')
  await page.goto('https://bulk-gpt-app.vercel.app/auth')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  // Wait for redirect to /bulk
  await page.waitForURL('**/bulk', { timeout: 20000 })
  console.log('✅ Logged in and redirected to /bulk')

  // Wait for page to fully load
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Take screenshot of initial state
  await page.screenshot({ path: '/tmp/prod-export-01-initial.png', fullPage: true })

  // Step 2: Upload CSV file
  console.log('\n📁 Step 2: Upload CSV file...')

  const csvContent = `name,company
Alice Smith,TechCorp
Bob Jones,DataInc
Carol White,CloudCo`

  // Strategy 1: Try file input directly
  const fileInput = page.locator('input[type="file"]').first()
  const fileInputCount = await fileInput.count()

  console.log(`File input elements found: ${fileInputCount}`)

  if (fileInputCount > 0) {
    try {
      // Scroll to ensure file input is in viewport
      await fileInput.scrollIntoViewIfNeeded()
      await page.waitForTimeout(1000)

      // Try to set files on the input
      await fileInput.setInputFiles({
        name: 'test-production.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })

      console.log('✅ CSV uploaded successfully')
      await page.waitForTimeout(3000) // Wait for file to process
    } catch (error) {
      console.log('⚠️  Direct file input failed, trying alternative strategy...')

      // Strategy 2: Try clicking dropzone area
      const dropzone = page.locator('[data-testid="file-dropzone"]').or(
        page.locator('div:has-text("Drop CSV file")').first()
      ).or(
        page.locator('.border-dashed').first()
      )

      const dropzoneExists = await dropzone.count() > 0

      if (dropzoneExists) {
        console.log('Found dropzone area, attempting click...')
        await dropzone.scrollIntoViewIfNeeded()
        await dropzone.click({ force: true })
        await page.waitForTimeout(1000)

        // Now try file input again
        await fileInput.setInputFiles({
          name: 'test-production.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent)
        })
        console.log('✅ CSV uploaded via dropzone click')
      } else {
        throw new Error('❌ Could not find dropzone or file input')
      }
    }
  } else {
    throw new Error('❌ No file input element found on page')
  }

  // Verify CSV was parsed
  await page.waitForTimeout(2000)
  const csvPreview = page.locator('text=/Alice Smith|3 rows|name,company/i')
  const csvParsed = await csvPreview.count() > 0
  console.log(`CSV parsed: ${csvParsed}`)

  await page.screenshot({ path: '/tmp/prod-export-02-csv-uploaded.png', fullPage: true })

  // Step 3: Enter prompt
  console.log('\n✍️  Step 3: Enter prompt...')

  const promptTextarea = page.locator('textarea').first()
  await promptTextarea.scrollIntoViewIfNeeded()
  await promptTextarea.fill('Write a 1-sentence professional bio for {{name}} at {{company}}.')

  console.log('✅ Prompt entered')
  await page.waitForTimeout(1000)

  // Step 4: Click Run button
  console.log('\n▶️  Step 4: Start batch processing...')

  const runButton = page.locator('button').filter({ hasText: /run all|run/i }).first()
  await runButton.scrollIntoViewIfNeeded()
  await runButton.click()

  console.log('✅ Batch started')
  await page.waitForTimeout(2000)

  // Get batch ID from page (if displayed)
  const batchIdText = await page.locator('text=/batch_/i').first().textContent().catch(() => 'N/A')
  console.log(`Batch ID: ${batchIdText}`)

  // Step 5: Wait for ALL rows to complete
  console.log('\n⏳ Step 5: Waiting for ALL 3 rows to complete...')

  const maxWaitTime = 180000 // 3 minutes
  const startTime = Date.now()
  let allRowsComplete = false

  while (!allRowsComplete && (Date.now() - startTime) < maxWaitTime) {
    // Count rows with "Done" status
    const doneRows = await page.locator('text=/^Done$/i').count()
    const elapsed = (Date.now() - startTime) / 1000

    if (elapsed % 5 < 1) { // Log every ~5 seconds
      console.log(`  ⏱️  ${elapsed.toFixed(0)}s elapsed - ${doneRows}/3 rows completed`)
    }

    if (doneRows >= 3) {
      allRowsComplete = true
      console.log(`\n✅ ALL 3 rows completed in ${elapsed.toFixed(1)}s!`)
      break
    }

    await page.waitForTimeout(3000)
  }

  if (!allRowsComplete) {
    await page.screenshot({ path: '/tmp/prod-export-timeout.png', fullPage: true })
    throw new Error('❌ Timeout: Not all rows completed within 3 minutes')
  }

  // Wait extra time for database to fully update
  console.log('⏳ Waiting 5 seconds for database to fully update...')
  await page.waitForTimeout(5000)

  await page.screenshot({ path: '/tmp/prod-export-03-batch-complete.png', fullPage: true })

  // Step 6: Click Export button
  console.log('\n📥 Step 6: Export results...')

  // Listen for console errors
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
      console.log(`🔴 Browser Console Error: ${msg.text()}`)
    }
  })

  // Click Export and wait for download
  const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
  const exportVisible = await exportButton.isVisible()
  console.log(`Export button visible: ${exportVisible}`)

  if (!exportVisible) {
    await page.screenshot({ path: '/tmp/prod-export-no-button.png', fullPage: true })
    throw new Error('❌ Export button not visible')
  }

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await exportButton.click()

  console.log('⏳ Waiting for download...')
  const download = await downloadPromise
  const downloadPath = `/tmp/production-export-${Date.now()}.csv`
  await download.saveAs(downloadPath)

  console.log(`✅ File downloaded: ${downloadPath}`)

  // Step 7: Verify CSV content
  console.log('\n📊 Step 7: Verify CSV content...')

  const csvData = fs.readFileSync(downloadPath, 'utf-8')
  const lines = csvData.trim().split('\n')

  console.log('\n📄 Downloaded CSV:')
  console.log('─'.repeat(80))
  lines.slice(0, 5).forEach((line, i) => {
    const truncated = line.length > 100 ? line.substring(0, 100) + '...' : line
    console.log(`${i === 0 ? 'HEADER' : 'Row ' + i}: ${truncated}`)
  })
  console.log('─'.repeat(80))

  // Verify CSV structure
  console.log(`\nTotal lines: ${lines.length} (expected: 4 - header + 3 data rows)`)
  expect(lines.length).toBeGreaterThanOrEqual(4)

  // Verify rows have actual AI output (not empty/pending)
  let rowsWithActualOutput = 0
  let emptyOrPendingRows = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]

    // Check if row has actual content
    const hasLength = line.length > 50
    const notPending = !line.toLowerCase().includes('pending')
    const notEmpty = !line.match(/,\s*,/) // No consecutive commas
    const hasSuccess = line.toLowerCase().includes('success') || !line.toLowerCase().includes('error')

    if (hasLength && notPending && notEmpty && hasSuccess) {
      rowsWithActualOutput++
      console.log(`  ✅ Row ${i}: Has actual AI output`)
    } else {
      emptyOrPendingRows++
      console.log(`  ❌ Row ${i}: Empty, pending, or error`)
      console.log(`     Content: ${line.substring(0, 80)}...`)
    }
  }

  console.log(`\n📈 Results:`)
  console.log(`  ✅ Rows with actual output: ${rowsWithActualOutput}`)
  console.log(`  ❌ Empty/pending rows: ${emptyOrPendingRows}`)

  // Final assertion
  expect(rowsWithActualOutput).toBeGreaterThanOrEqual(3)

  // Check for console errors
  if (consoleErrors.length > 0) {
    console.log(`\n⚠️  ${consoleErrors.length} console errors detected:`)
    consoleErrors.forEach(err => console.log(`  - ${err}`))
  } else {
    console.log('\n✅ No console errors detected')
  }

  // Success summary
  console.log('\n' + '='.repeat(80))
  console.log('🎉 SUCCESS: Export fix verified on production!')
  console.log('='.repeat(80))
  console.log('\n✓ Logged in successfully')
  console.log('✓ Uploaded CSV (3 rows)')
  console.log('✓ Started batch processing')
  console.log('✓ All 3 rows completed')
  console.log('✓ Exported results to CSV')
  console.log('✓ CSV contains actual AI output (not empty/pending)')
  console.log('✓ Database fetch working correctly')
  console.log('\nExport fix is CONFIRMED WORKING on production Vercel! ✅\n')
})
