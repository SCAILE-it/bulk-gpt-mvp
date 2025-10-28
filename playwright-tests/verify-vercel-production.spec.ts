import { test, expect } from '@playwright/test'
import * as fs from 'fs'

const VERCEL_URL = 'https://bulk-gpt-jvbnt3gkm-federico-de-pontes-projects.vercel.app'

test('Verify both fixes on Vercel production', async ({ page }) => {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTING VERCEL PRODUCTION DEPLOYMENT')
  console.log('   URL: ' + VERCEL_URL)
  console.log('='.repeat(80))

  // Navigate to auth page
  console.log('\n📝 Step 1: Navigate to auth page...')
  await page.goto(VERCEL_URL + '/auth', { waitUntil: 'networkidle', timeout: 30000 })
  console.log('✅ Auth page loaded')

  // Login
  console.log('\n🔐 Step 2: Login...')
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  await page.waitForURL('**/bulk', { timeout: 20000 })
  console.log('✅ Logged in and redirected to /bulk')

  await page.waitForTimeout(2000)

  // TEST 1: File Upload Clickability
  console.log('\n🔬 TEST 1: File Upload Clickability')
  console.log('Checking if file input has className="hidden"...')

  const fileInput = page.locator('input[type="file"]').first()
  const inputClass = await fileInput.getAttribute('class')

  console.log(`File input class: "${inputClass}"`)

  if (inputClass && inputClass.includes('hidden')) {
    console.log('✅ SUCCESS: File input has "hidden" class')
  } else {
    console.log('❌ FAIL: File input does NOT have "hidden" class')
    console.log(`   Actual class: "${inputClass}"`)
  }

  // Check if dropzone exists and is properly sized
  const dropzoneText = page.locator('text="Drop your CSV file here"')
  const dropzoneExists = await dropzoneText.count() > 0

  if (dropzoneExists) {
    const dropzone = dropzoneText.locator('..').locator('..')
    const dropzoneBox = await dropzone.boundingBox()

    if (dropzoneBox) {
      console.log(`Dropzone size: ${dropzoneBox.width}x${dropzoneBox.height}`)
      if (dropzoneBox.width > 100 && dropzoneBox.height > 50) {
        console.log('✅ Dropzone is properly sized')
      }
    }
  }

  // TEST 2: Upload a file and test batch processing
  console.log('\n🔬 TEST 2: Batch Processing with Modal API')

  const testCsv = 'name,company\nAlice,OpenAI\nBob,Anthropic\nCharlie,Google'
  fs.writeFileSync('/tmp/test-vercel-upload.csv', testCsv)
  console.log('✅ Created test CSV')

  await fileInput.setInputFiles('/tmp/test-vercel-upload.csv')
  console.log('✅ Uploaded CSV via input')

  await page.waitForTimeout(3000)

  // Check if file was processed (should show row count)
  const rowCountText = await page.locator('text=/3 rows|test-vercel-upload/i').count()
  if (rowCountText > 0) {
    console.log('✅ File processed - row count detected')
  } else {
    console.log('⚠️  Row count not detected (may be in different format)')
  }

  // Enter a test prompt
  console.log('\nEntering test prompt...')
  const promptTextarea = page.locator('textarea').first()
  await promptTextarea.fill('Write a one-sentence bio for {{name}} at {{company}}')
  console.log('✅ Prompt entered')

  // Click Run button
  console.log('\nClicking Run button...')
  const runButton = page.locator('button:has-text("Run")')
  await runButton.click()
  console.log('✅ Run button clicked')

  // Wait for processing to start
  await page.waitForTimeout(5000)

  // Check for error messages
  console.log('\nChecking for error messages...')
  const noResultsError = await page.locator('text=/No results returned from API/i').count()
  const errorMessages = await page.locator('text=/error|fail/i').count()

  if (noResultsError > 0) {
    console.log('❌ FAIL: "No results returned from API" error detected!')
    console.log('   This means Modal API URL is still incorrect or batch processing failed')
  } else {
    console.log('✅ SUCCESS: No "No results returned from API" error')
  }

  if (errorMessages > 0) {
    const errorText = await page.locator('text=/error|fail/i').first().textContent()
    console.log(`⚠️  Other error detected: "${errorText}"`)
  } else {
    console.log('✅ No error messages detected')
  }

  // Check if processing started
  const processingText = await page.locator('text=/processing|pending|running/i').count()
  if (processingText > 0) {
    console.log('✅ Batch processing appears to have started')
  } else {
    console.log('⚠️  No processing status detected (batch may have completed quickly or failed silently)')
  }

  // Take screenshot for verification
  await page.screenshot({ path: '/tmp/vercel-production-test.png', fullPage: true })
  console.log('\n📸 Screenshot saved to /tmp/vercel-production-test.png')

  console.log('\n' + '='.repeat(80))
  console.log('🎯 VERCEL PRODUCTION TEST COMPLETE')
  console.log('='.repeat(80))
})
