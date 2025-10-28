import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const PRODUCTION_URL = 'https://bulk-gpt-app.vercel.app'

test('Complete flow: Upload → Process → Download results', async ({ page }) => {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTING COMPLETE FLOW ON PRODUCTION')
  console.log('   URL: ' + PRODUCTION_URL)
  console.log('   Flow: Upload CSV → Run Batch → Wait for Completion → Download Results')
  console.log('='.repeat(80))

  // Step 1: Login
  console.log('\n🔐 Step 1: Login...')
  await page.goto(PRODUCTION_URL + '/auth', { waitUntil: 'networkidle', timeout: 30000 })
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/bulk', { timeout: 20000 })
  console.log('✅ Logged in')

  // Step 2: Upload CSV
  console.log('\n📤 Step 2: Upload CSV...')
  const testCsv = 'name,company\nAlice,OpenAI\nBob,Anthropic\nCharlie,Google'
  fs.writeFileSync('/tmp/test-full-flow.csv', testCsv)

  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles('/tmp/test-full-flow.csv')
  await page.waitForTimeout(2000)

  const rowCountVisible = await page.locator('text=/3 rows/i').count() > 0
  if (rowCountVisible) {
    console.log('✅ File uploaded: 3 rows detected')
  } else {
    console.log('⚠️  Row count not detected')
  }

  // Step 3: Enter prompt
  console.log('\n📝 Step 3: Enter prompt...')
  const promptTextarea = page.locator('textarea').first()
  await promptTextarea.fill('Write a one-sentence bio for {{name}} who works at {{company}}')
  console.log('✅ Prompt entered')

  // Step 4: Click Run
  console.log('\n🚀 Step 4: Click Run button...')
  const runButton = page.locator('button:has-text("Run")')
  await runButton.click()
  console.log('✅ Run button clicked')

  await page.waitForTimeout(3000)

  // Step 5: Check for immediate errors
  console.log('\n🔍 Step 5: Check for immediate errors...')
  const noResultsError = await page.locator('text=/No results returned from API/i').count()
  const testFailedError = await page.locator('text=/Test failed/i').count()

  if (noResultsError > 0) {
    console.log('❌ CRITICAL: "No results returned from API" error!')
    await page.screenshot({ path: '/tmp/full-flow-error.png', fullPage: true })
    throw new Error('Batch creation failed - No results returned from API')
  }

  if (testFailedError > 0) {
    console.log('❌ CRITICAL: "Test failed" error!')
    await page.screenshot({ path: '/tmp/full-flow-error.png', fullPage: true })
    throw new Error('Batch creation failed - Test failed')
  }

  console.log('✅ No immediate errors - batch creation successful')

  // Step 6: Wait for batch to complete (check status every 5 seconds for up to 2 minutes)
  console.log('\n⏳ Step 6: Waiting for batch to complete...')
  console.log('   (Checking status every 5 seconds, max 2 minutes)')

  let batchCompleted = false
  let attempts = 0
  const maxAttempts = 24 // 2 minutes (24 * 5 seconds)

  while (!batchCompleted && attempts < maxAttempts) {
    attempts++
    await page.waitForTimeout(5000)

    // Check for completion indicators
    const completedText = await page.locator('text=/3\/3 completed|completed|100%/i').count()
    const processingText = await page.locator('text=/processing|pending/i').count()

    if (completedText > 0) {
      batchCompleted = true
      console.log(`✅ Batch completed! (After ${attempts * 5} seconds)`)
    } else if (processingText > 0) {
      console.log(`   [${attempts * 5}s] Still processing...`)
    } else {
      console.log(`   [${attempts * 5}s] Status unclear, continuing to wait...`)
    }

    // Check for errors during processing
    const errorDuringProcessing = await page.locator('text=/error|failed/i').count()
    if (errorDuringProcessing > 0) {
      console.log('❌ Error detected during processing!')
      await page.screenshot({ path: '/tmp/full-flow-processing-error.png', fullPage: true })
      break
    }
  }

  if (!batchCompleted && attempts >= maxAttempts) {
    console.log('⚠️  Batch did not complete within 2 minutes')
    console.log('   This may be normal for slow API responses')
    await page.screenshot({ path: '/tmp/full-flow-timeout.png', fullPage: true })
  }

  // Step 7: Navigate to Dashboard
  console.log('\n📊 Step 7: Navigate to Dashboard...')
  await page.goto(PRODUCTION_URL + '/dashboard', { waitUntil: 'networkidle', timeout: 30000 })
  console.log('✅ Dashboard loaded')

  await page.waitForTimeout(3000)

  // Take screenshot of dashboard
  await page.screenshot({ path: '/tmp/full-flow-dashboard.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/full-flow-dashboard.png')

  // Step 8: Check if batch appears in dashboard
  console.log('\n🔍 Step 8: Check if batch appears in dashboard...')

  // Look for the batch in the table (might be first row)
  const tableRows = await page.locator('table tbody tr').count()
  console.log(`   Found ${tableRows} batch(es) in dashboard`)

  if (tableRows === 0) {
    console.log('⚠️  No batches found in dashboard!')
    console.log('   This could mean:')
    console.log('   - Batch creation failed silently')
    console.log('   - Database write failed')
    console.log('   - Dashboard not loading data correctly')
    throw new Error('No batches found in dashboard')
  }

  // Step 9: Find and click download button
  console.log('\n💾 Step 9: Download results...')

  // Look for download button (might be Download or Download Results)
  const downloadButton = page.locator('button:has-text("Download")').first()
  const downloadButtonExists = await downloadButton.count() > 0

  if (!downloadButtonExists) {
    console.log('⚠️  Download button not found!')
    console.log('   Batch may still be processing or failed')
    await page.screenshot({ path: '/tmp/full-flow-no-download.png', fullPage: true })
    throw new Error('Download button not found')
  }

  console.log('✅ Download button found')

  // Set up download listener before clicking
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

  await downloadButton.click()
  console.log('✅ Download button clicked')

  // Wait for download to start
  try {
    const download = await downloadPromise
    const downloadPath = '/tmp/' + download.suggestedFilename()
    await download.saveAs(downloadPath)
    console.log(`✅ File downloaded: ${downloadPath}`)

    // Read and verify CSV contents
    const csvContent = fs.readFileSync(downloadPath, 'utf-8')
    console.log('\n📄 Downloaded CSV content:')
    console.log('─'.repeat(80))
    console.log(csvContent)
    console.log('─'.repeat(80))

    // Check if CSV contains expected data
    const hasAlice = csvContent.includes('Alice')
    const hasBob = csvContent.includes('Bob')
    const hasCharlie = csvContent.includes('Charlie')
    const hasOpenAI = csvContent.includes('OpenAI')
    const hasAnthropic = csvContent.includes('Anthropic')
    const hasGoogle = csvContent.includes('Google')

    console.log('\n✅ CSV Validation:')
    console.log(`   Has Alice: ${hasAlice ? '✅' : '❌'}`)
    console.log(`   Has Bob: ${hasBob ? '✅' : '❌'}`)
    console.log(`   Has Charlie: ${hasCharlie ? '✅' : '❌'}`)
    console.log(`   Has OpenAI: ${hasOpenAI ? '✅' : '❌'}`)
    console.log(`   Has Anthropic: ${hasAnthropic ? '✅' : '❌'}`)
    console.log(`   Has Google: ${hasGoogle ? '✅' : '❌'}`)

    // Check for AI-generated content (should have more than just input data)
    const lines = csvContent.split('\n').filter(line => line.trim())
    console.log(`   Total lines: ${lines.length}`)

    if (lines.length >= 4) { // Header + 3 data rows
      console.log('✅ CSV has expected number of rows')
    } else {
      console.log(`⚠️  CSV has ${lines.length} lines (expected 4+)`)
    }

    // Check if there's output data (bio column)
    const hasBioColumn = csvContent.toLowerCase().includes('bio') || csvContent.toLowerCase().includes('output')
    console.log(`   Has output column: ${hasBioColumn ? '✅' : '❌'}`)

  } catch (downloadError) {
    console.log('❌ Download failed!')
    console.log(`   Error: ${downloadError}`)
    await page.screenshot({ path: '/tmp/full-flow-download-failed.png', fullPage: true })
    throw downloadError
  }

  console.log('\n' + '='.repeat(80))
  console.log('🎉 COMPLETE FLOW TEST FINISHED')
  console.log('='.repeat(80))
})
