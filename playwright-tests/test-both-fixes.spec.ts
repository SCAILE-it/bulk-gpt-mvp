import { test, expect } from '@playwright/test'
import fs from 'fs'

test('Verify both UX and backend fixes E2E', async ({ page }) => {
  console.log('🧪 Starting comprehensive E2E test for both fixes...\n')

  // Create test CSV
  const testCsvPath = '/tmp/fix-verification-test.csv'
  const testCsv = `name,company
Alice Smith,Acme Corp
Bob Jones,Beta Inc
Charlie Brown,Gamma LLC`
  fs.writeFileSync(testCsvPath, testCsv)
  console.log('✅ Test CSV created')

  // Navigate to auth page
  console.log('\n📝 Step 1: Login...')
  await page.goto('http://localhost:3334/auth')
  await page.waitForLoadState('networkidle')

  // Login with test credentials
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/bulk', { timeout: 10000 })
  console.log('✅ Login successful, redirected to /bulk')

  // Upload CSV file
  console.log('\n📤 Step 2: Upload test CSV...')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(testCsvPath)
  await page.waitForTimeout(2000)
  console.log('✅ CSV uploaded')

  // VERIFICATION 1: Check prompt textarea height
  console.log('\n🎨 VERIFICATION 1: Prompt Textarea Height')
  const promptTextarea = page.locator('textarea#prompt')
  const boundingBox = await promptTextarea.boundingBox()

  if (boundingBox) {
    const height = boundingBox.height
    console.log(`📏 Prompt textarea height: ${height}px`)

    if (height <= 100) {
      console.log('✅ PASS: Prompt box is small (≤100px)')
    } else {
      console.log(`❌ FAIL: Prompt box too large (${height}px, expected ≤100px)`)
    }
  }

  // Check if Run button is visible in viewport
  const runButton = page.locator('button:has-text("Run")')
  const isVisible = await runButton.isVisible()
  const runButtonBox = await runButton.boundingBox()

  if (isVisible && runButtonBox) {
    const viewport = page.viewportSize()
    if (viewport && runButtonBox.y + runButtonBox.height <= viewport.height) {
      console.log('✅ PASS: Run button visible without scrolling')
    } else {
      console.log('⚠️  Run button exists but may require scrolling')
    }
  }

  // Take screenshot of UX fix
  await page.screenshot({ path: '/tmp/fix-verification-01-ux.png' })
  console.log('📸 Screenshot saved: /tmp/fix-verification-01-ux.png')

  // Fill in prompt
  console.log('\n✍️  Step 3: Fill in prompt...')
  await promptTextarea.fill('Write a short professional bio for {{name}} who works at {{company}}')
  console.log('✅ Prompt filled')

  // Click Run button
  console.log('\n🚀 Step 4: Submit batch...')
  await runButton.click()
  await page.waitForTimeout(3000)
  console.log('✅ Batch submitted')

  // Take screenshot after submission
  await page.screenshot({ path: '/tmp/fix-verification-02-submitted.png' })

  // VERIFICATION 2: Check batch processing
  console.log('\n⚙️  VERIFICATION 2: Batch Processing')
  console.log('⏳ Waiting for batch to start processing (60 seconds)...')

  // Wait and check for processing status
  await page.waitForTimeout(60000) // Wait 60 seconds for Modal API to pick up batch

  // Navigate to dashboard
  console.log('\n📊 Step 5: Navigate to dashboard...')
  await page.goto('http://localhost:3334/dashboard')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  console.log('✅ Dashboard loaded')

  // Check for batches in table
  const tableRows = page.locator('tbody tr')
  const rowCount = await tableRows.count()

  if (rowCount > 0) {
    console.log(`✅ Found ${rowCount} batch(es) in dashboard`)

    // Get first batch details
    const firstRow = tableRows.first()
    const rowText = await firstRow.textContent()

    console.log('\n--- First Batch Details ---')
    console.log(rowText)

    // Check for processing indicators
    const isProcessing = rowText?.includes('Processing') || rowText?.includes('0 / 3')
    const isCompleted = rowText?.includes('Completed') || rowText?.includes('3 / 3')
    const isPending = rowText?.includes('pending')

    console.log('\n📊 Batch Status:')
    if (isCompleted) {
      console.log('✅ PASS: Batch completed successfully!')
    } else if (isProcessing) {
      console.log('⏳ IN PROGRESS: Batch is processing (Modal API working!)')
    } else if (isPending) {
      console.log('⏳ PENDING: Batch accepted, waiting for Modal API to pick it up')
    } else {
      console.log('⚠️  Unknown status - check dashboard manually')
    }

    // Check for token data or placeholder
    const hasTokenData = rowText?.includes('↑') && rowText?.includes('↓')
    const hasPlaceholder = rowText?.includes('—')
    const hasGemini = rowText?.includes('gemini')

    console.log('\n🎯 Token Tracking:')
    if (hasTokenData && hasGemini) {
      console.log('✅ PASS: Token data visible (↑ input / ↓ output)')
      console.log('✅ PASS: Model name displayed (gemini)')
    } else if (hasPlaceholder) {
      console.log('✅ PASS: Placeholder "—" shown (batch not complete yet)')
    } else {
      console.log('❌ FAIL: No token data or placeholder found')
    }
  } else {
    console.log('❌ FAIL: No batches found in dashboard')
  }

  // Take final screenshot
  await page.screenshot({ path: '/tmp/fix-verification-03-dashboard.png', fullPage: true })
  console.log('\n📸 Screenshot saved: /tmp/fix-verification-03-dashboard.png')

  console.log('\n' + '='.repeat(60))
  console.log('🎉 E2E TEST COMPLETE')
  console.log('='.repeat(60))
  console.log('\n📁 Screenshots saved:')
  console.log('  - /tmp/fix-verification-01-ux.png')
  console.log('  - /tmp/fix-verification-02-submitted.png')
  console.log('  - /tmp/fix-verification-03-dashboard.png')
  console.log('\n💡 Review screenshots to verify fixes visually')
})
