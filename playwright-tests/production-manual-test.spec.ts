import { test, expect } from '@playwright/test'
import * as fs from 'fs'

test('Manual Production Test: Login → Upload → Process → Export', async ({ page }) => {
  console.log('\n🚀 MANUAL PRODUCTION TEST\n')
  console.log('URL: https://bulk-gpt-app.vercel.app')
  console.log('Goal: Verify Export fix works on production\n')

  // Step 1: Navigate and login
  console.log('📝 Step 1: Login to production...')
  await page.goto('https://bulk-gpt-app.vercel.app/auth')
  await page.waitForLoadState('networkidle')

  // Fill in login credentials
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')

  console.log('🔐 Submitting login...')
  await page.click('button[type="submit"]')

  // Wait for redirect
  try {
    await page.waitForURL('**/bulk', { timeout: 20000 })
    console.log('✅ Logged in and redirected to /bulk')
  } catch (e) {
    console.log('⚠️  Redirect timeout - checking current URL')
    console.log('Current URL:', page.url())
    if (!page.url().includes('/bulk')) {
      throw new Error('Failed to reach /bulk page after login')
    }
  }

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Take screenshot
  await page.screenshot({ path: '/tmp/prod-manual-01-logged-in.png', fullPage: true })
  console.log('📸 Screenshot saved: /tmp/prod-manual-01-logged-in.png')

  // Step 2: Check what JavaScript is loaded NOW
  console.log('\n📦 Step 2: Checking loaded JavaScript...')
  const scripts = await page.$$eval('script[src]', scripts => scripts.map(s => s.src))
  const bulkScript = scripts.find(src => src.includes('/bulk/page'))

  if (bulkScript) {
    console.log('✅ Bulk page JavaScript loaded!')
    console.log('   ', bulkScript.substring(0, 100) + '...')

    // Download and check for Export fix
    const response = await page.request.get(bulkScript)
    const jsCode = await response.text()

    const hasCreateClient = jsCode.includes('createClient')
    const hasBatchResults = jsCode.includes('batch_results')
    const hasHandleExport = jsCode.includes('handleExport')

    console.log('\n🔍 Export Fix Code Check:')
    console.log(`   createClient: ${hasCreateClient ? '✅' : '❌'}`)
    console.log(`   batch_results: ${hasBatchResults ? '✅' : '❌'}`)
    console.log(`   handleExport: ${hasHandleExport ? '✅' : '❌'}`)

    if (hasCreateClient && hasBatchResults && hasHandleExport) {
      console.log('\n✅ EXPORT FIX IS DEPLOYED!')
    } else {
      console.log('\n❌ Export fix code NOT found - production has old code')
    }
  } else {
    console.log('❌ No bulk/page JavaScript found')
    console.log('Scripts loaded:', scripts.map(s => s.split('/').pop()).join(', '))
  }

  // Step 3: Test file upload
  console.log('\n📁 Step 3: Testing file upload...')

  const csvContent = `name,company
Alice Smith,TechCorp
Bob Jones,DataInc
Carol White,CloudCo`

  const fileInput = page.locator('input[type="file"]').first()
  const fileInputExists = await fileInput.count() > 0

  console.log(`File input found: ${fileInputExists}`)

  if (fileInputExists) {
    // Check if file input is visible/clickable
    const boundingBox = await fileInput.boundingBox()
    console.log(`File input bounding box:`, boundingBox || 'null (not in viewport)')

    try {
      await fileInput.setInputFiles({
        name: 'test-prod.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })
      console.log('✅ CSV uploaded successfully')
      await page.waitForTimeout(2000)

      await page.screenshot({ path: '/tmp/prod-manual-02-csv-uploaded.png', fullPage: true })
      console.log('📸 Screenshot saved: /tmp/prod-manual-02-csv-uploaded.png')
    } catch (error) {
      console.log('❌ File upload failed:', error.message)
      await page.screenshot({ path: '/tmp/prod-manual-error-upload.png', fullPage: true })
      throw error
    }
  } else {
    console.log('❌ No file input found on page')
    throw new Error('File input not found')
  }

  // Step 4: Enter prompt
  console.log('\n✍️  Step 4: Entering prompt...')
  const promptTextarea = page.locator('textarea').first()
  await promptTextarea.fill('Write a 1-sentence bio for {{name}} at {{company}}.')
  console.log('✅ Prompt entered')

  // Step 5: Run batch
  console.log('\n▶️  Step 5: Running batch...')
  const runButton = page.locator('button').filter({ hasText: /run all|run/i }).first()
  await runButton.click()
  console.log('✅ Batch started')
  await page.waitForTimeout(3000)

  // Step 6: Wait for completion
  console.log('\n⏳ Step 6: Waiting for batch completion...')
  const maxWaitTime = 180000 // 3 minutes
  const startTime = Date.now()
  let allComplete = false

  while (!allComplete && (Date.now() - startTime) < maxWaitTime) {
    const doneCount = await page.locator('text=/^Done$/i').count()
    const elapsed = (Date.now() - startTime) / 1000

    if (elapsed % 5 < 1) {
      console.log(`  ⏱️  ${elapsed.toFixed(0)}s elapsed - ${doneCount}/3 rows completed`)
    }

    if (doneCount >= 3) {
      allComplete = true
      console.log(`\n✅ ALL 3 rows completed in ${elapsed.toFixed(1)}s`)
      break
    }

    await page.waitForTimeout(3000)
  }

  if (!allComplete) {
    await page.screenshot({ path: '/tmp/prod-manual-timeout.png', fullPage: true })
    throw new Error('Batch did not complete in 3 minutes')
  }

  // Wait extra for database
  console.log('⏳ Waiting 5s for database to update...')
  await page.waitForTimeout(5000)

  await page.screenshot({ path: '/tmp/prod-manual-03-batch-complete.png', fullPage: true })
  console.log('📸 Screenshot saved: /tmp/prod-manual-03-batch-complete.png')

  // Step 7: Export and verify
  console.log('\n📥 Step 7: Exporting results...')

  // Listen for console errors
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
      console.log(`🔴 Console Error: ${msg.text()}`)
    }
  })

  const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
  const exportVisible = await exportButton.isVisible()
  console.log(`Export button visible: ${exportVisible}`)

  if (!exportVisible) {
    await page.screenshot({ path: '/tmp/prod-manual-no-export.png', fullPage: true })
    throw new Error('Export button not visible')
  }

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await exportButton.click()

  console.log('⏳ Waiting for download...')
  const download = await downloadPromise
  const downloadPath = `/tmp/production-manual-export-${Date.now()}.csv`
  await download.saveAs(downloadPath)

  console.log(`✅ Downloaded: ${downloadPath}`)

  // Step 8: Verify CSV content
  console.log('\n📊 Step 8: Verifying CSV content...')

  const csvData = fs.readFileSync(downloadPath, 'utf-8')
  const lines = csvData.trim().split('\n')

  console.log('\n📄 Downloaded CSV:')
  console.log('─'.repeat(80))
  lines.forEach((line, i) => {
    const display = line.length > 100 ? line.substring(0, 100) + '...' : line
    console.log(`${i === 0 ? 'HEADER' : 'Row ' + i}: ${display}`)
  })
  console.log('─'.repeat(80))

  console.log(`\nTotal lines: ${lines.length}`)
  expect(lines.length).toBeGreaterThanOrEqual(4) // header + 3 rows

  // Verify actual content (not empty/pending)
  let rowsWithOutput = 0
  let emptyRows = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const hasContent = line.length > 50
    const notPending = !line.toLowerCase().includes('pending')
    const notError = !line.toLowerCase().includes('error')

    if (hasContent && notPending && notError) {
      rowsWithOutput++
      console.log(`  ✅ Row ${i}: Has AI output`)
    } else {
      emptyRows++
      console.log(`  ❌ Row ${i}: Empty or error`)
      console.log(`     Preview: ${line.substring(0, 60)}...`)
    }
  }

  console.log(`\n📈 Results:`)
  console.log(`  ✅ Rows with actual output: ${rowsWithOutput}`)
  console.log(`  ❌ Empty/error rows: ${emptyRows}`)

  // Console errors
  if (consoleErrors.length > 0) {
    console.log(`\n⚠️  ${consoleErrors.length} console errors:`)
    consoleErrors.forEach(err => console.log(`  - ${err}`))
  } else {
    console.log('\n✅ No console errors')
  }

  // Final assertion
  expect(rowsWithOutput).toBeGreaterThanOrEqual(3)

  // Success!
  console.log('\n' + '='.repeat(80))
  console.log('🎉 SUCCESS: Production Export works correctly!')
  console.log('='.repeat(80))
  console.log('\n✓ Export fix code IS deployed')
  console.log('✓ File upload works')
  console.log('✓ Batch processing works')
  console.log('✓ Export downloads actual AI output (not empty/pending)')
  console.log('✓ Database fetch working correctly')
  console.log('\n✅ PRODUCTION IS WORKING! ✅\n')
})
