import { test, expect } from '@playwright/test'
import * as fs from 'fs'

// Use MAIN production URL, not preview URL
const PRODUCTION_URL = 'https://bulk-gpt-app.vercel.app'

test('Verify file upload and batch processing on ACTUAL production', async ({ page }) => {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTING ACTUAL PRODUCTION DEPLOYMENT')
  console.log('   URL: ' + PRODUCTION_URL)
  console.log('='.repeat(80))

  // Navigate to auth page
  console.log('\n📝 Step 1: Navigate to auth page...')
  await page.goto(PRODUCTION_URL + '/auth', { waitUntil: 'networkidle', timeout: 30000 })
  console.log('✅ Auth page loaded')

  // Take screenshot of auth page
  await page.screenshot({ path: '/tmp/prod-test-01-auth.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/prod-test-01-auth.png')

  // Login
  console.log('\n🔐 Step 2: Login...')
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  await page.waitForURL('**/bulk', { timeout: 20000 })
  console.log('✅ Logged in and redirected to /bulk')

  await page.waitForTimeout(2000)

  // Take screenshot of bulk page
  await page.screenshot({ path: '/tmp/prod-test-02-bulk-page.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/prod-test-02-bulk-page.png')

  // TEST 1: File Upload Clickability
  console.log('\n🔬 TEST 1: File Upload Clickability')
  console.log('Checking if file input has className="hidden"...')

  const fileInput = page.locator('input[type="file"]').first()
  const inputClass = await fileInput.getAttribute('class')
  const inputBox = await fileInput.boundingBox()

  console.log(`File input class: "${inputClass}"`)
  if (inputBox) {
    console.log(`File input size: ${inputBox.width}x${inputBox.height}`)
  }

  if (inputClass && inputClass.includes('hidden')) {
    console.log('✅ SUCCESS: File input has "hidden" class')
  } else {
    console.log('❌ FAIL: File input does NOT have "hidden" class')
    console.log(`   Expected: className includes "hidden"`)
    console.log(`   Actual: "${inputClass}"`)
  }

  // Check dropzone size
  const dropzoneText = page.locator('text="Drop your CSV file here"')
  const dropzoneExists = await dropzoneText.count() > 0

  if (dropzoneExists) {
    const dropzone = dropzoneText.locator('..').locator('..')
    const dropzoneBox = await dropzone.boundingBox()

    if (dropzoneBox) {
      console.log(`Dropzone size: ${dropzoneBox.width}x${dropzoneBox.height}`)
      if (dropzoneBox.width > 100 && dropzoneBox.height > 50) {
        console.log('✅ Dropzone is properly sized and should be clickable')
      } else {
        console.log('❌ Dropzone is too small')
      }
    }
  } else {
    console.log('⚠️  Dropzone text not found - may already have file uploaded')
  }

  // TEST 2: Upload file and test batch processing
  console.log('\n🔬 TEST 2: Batch Processing with Modal API')

  const testCsv = 'name,company\nAlice,OpenAI\nBob,Anthropic\nCharlie,Google'
  fs.writeFileSync('/tmp/test-production.csv', testCsv)
  console.log('✅ Created test CSV: /tmp/test-production.csv')

  await fileInput.setInputFiles('/tmp/test-production.csv')
  console.log('✅ Uploaded CSV via file input')

  await page.waitForTimeout(3000)

  // Check if file was processed
  const rowCountText = await page.locator('text=/3 rows|test-production/i').count()
  if (rowCountText > 0) {
    console.log('✅ File processed successfully - row count detected')
  } else {
    console.log('⚠️  Row count not detected (checking page content...)')
    const pageContent = await page.content()
    if (pageContent.includes('3') || pageContent.includes('test-production')) {
      console.log('   Found file reference in page content')
    }
  }

  // Take screenshot after file upload
  await page.screenshot({ path: '/tmp/prod-test-03-file-uploaded.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/prod-test-03-file-uploaded.png')

  // Enter test prompt
  console.log('\n📝 Step 3: Enter prompt...')
  const promptTextarea = page.locator('textarea').first()
  await promptTextarea.fill('Write a one-sentence bio for {{name}} at {{company}}')
  console.log('✅ Prompt entered')

  // Take screenshot before clicking Run
  await page.screenshot({ path: '/tmp/prod-test-04-before-run.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/prod-test-04-before-run.png')

  // Click Run button
  console.log('\n🚀 Step 4: Click Run button...')
  const runButton = page.locator('button:has-text("Run")')

  // Check if Run button is visible
  const runButtonVisible = await runButton.isVisible()
  if (runButtonVisible) {
    console.log('✅ Run button is visible')
  } else {
    console.log('❌ FAIL: Run button is NOT visible!')
  }

  await runButton.click()
  console.log('✅ Run button clicked')

  // Wait for processing to start
  await page.waitForTimeout(5000)

  // Take screenshot after clicking Run
  await page.screenshot({ path: '/tmp/prod-test-05-after-run.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/prod-test-05-after-run.png')

  // Check for errors
  console.log('\n🔍 Step 5: Check for errors...')

  const noResultsError = await page.locator('text=/No results returned from API/i').count()
  const modalApiError = await page.locator('text=/Modal API/i').count()
  const testFailedError = await page.locator('text=/Test failed/i').count()

  if (noResultsError > 0) {
    console.log('❌ CRITICAL: "No results returned from API" error detected!')
    console.log('   This means Modal API is STILL not working correctly')
  } else {
    console.log('✅ SUCCESS: No "No results returned from API" error')
  }

  if (testFailedError > 0) {
    console.log('❌ CRITICAL: "Test failed" error detected!')
  } else {
    console.log('✅ SUCCESS: No "Test failed" error')
  }

  // Check if processing started
  const processingIndicators = await page.locator('text=/processing|pending|running|completed/i').count()
  if (processingIndicators > 0) {
    console.log('✅ Batch processing appears to have started or completed')

    const processingText = await page.locator('text=/processing|pending|running|completed/i').first().textContent()
    console.log(`   Status text: "${processingText}"`)
  } else {
    console.log('⚠️  No processing status detected')
  }

  // Final screenshot
  await page.screenshot({ path: '/tmp/prod-test-06-final.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/prod-test-06-final.png')

  console.log('\n' + '='.repeat(80))
  console.log('🎯 PRODUCTION TEST COMPLETE')
  console.log('='.repeat(80))
  console.log('\n📸 6 screenshots saved to /tmp/prod-test-*.png')
  console.log('\n🔍 RESULTS SUMMARY:')
  console.log(`   File input hidden class: ${inputClass?.includes('hidden') ? '✅' : '❌'}`)
  console.log(`   Dropzone size: ${dropzoneExists ? '✅' : '⚠️'}`)
  console.log(`   File upload: ${rowCountText > 0 ? '✅' : '⚠️'}`)
  console.log(`   Run button visible: ${runButtonVisible ? '✅' : '❌'}`)
  console.log(`   No API errors: ${noResultsError === 0 && testFailedError === 0 ? '✅' : '❌'}`)
  console.log(`   Processing started: ${processingIndicators > 0 ? '✅' : '⚠️'}`)
})
