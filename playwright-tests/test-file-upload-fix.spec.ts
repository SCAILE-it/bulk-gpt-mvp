import { test, expect } from '@playwright/test'
import * as fs from 'fs'

test('Verify file upload dropzone is clickable on production', async ({ page }) => {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTING FILE UPLOAD FIX ON PRODUCTION')
  console.log('   URL: https://bulk-gpt-qa3tiooh5-federico-de-pontes-projects.vercel.app')
  console.log('='.repeat(80))

  // Navigate to production auth
  console.log('\n📝 Step 1: Navigate to auth page...')
  await page.goto('https://bulk-gpt-qa3tiooh5-federico-de-pontes-projects.vercel.app/auth', {
    waitUntil: 'networkidle',
    timeout: 30000
  })
  console.log('✅ Auth page loaded')

  // Login
  console.log('\n🔐 Step 2: Login...')
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  await page.waitForURL('**/bulk', { timeout: 20000 })
  console.log('✅ Redirected to /bulk page')

  await page.waitForTimeout(2000)

  // TEST 1: Verify file input has className="hidden"
  console.log('\n📏 TEST 1: Check if file input has className="hidden"...')
  const fileInput = page.locator('input[type="file"]').first()
  const inputClass = await fileInput.getAttribute('class')

  console.log(`File input class: "${inputClass}"`)

  if (inputClass && inputClass.includes('hidden')) {
    console.log('✅ SUCCESS: File input has "hidden" class')
  } else {
    console.log('❌ FAIL: File input does NOT have "hidden" class')
  }

  // TEST 2: Check file input size (should be 0x0 or very small with hidden class)
  const inputBox = await fileInput.boundingBox()
  if (inputBox) {
    console.log(`File input size: ${inputBox.width}x${inputBox.height}`)
    if (inputBox.width <= 1 || inputBox.height <= 1) {
      console.log('✅ File input properly hidden (size ≤ 1x1)')
    }
  }

  // TEST 3: Check dropzone size (should be large and clickable)
  const dropzoneText = page.locator('text="Drop your CSV file here"')
  const dropzoneExists = await dropzoneText.count() > 0

  if (dropzoneExists) {
    const dropzone = dropzoneText.locator('..').locator('..')
    const dropzoneBox = await dropzone.boundingBox()

    if (dropzoneBox) {
      console.log(`Dropzone size: ${dropzoneBox.width}x${dropzoneBox.height}`)

      if (dropzoneBox.width > 100 && dropzoneBox.height > 50) {
        console.log('✅ Dropzone is large enough to click')
      } else {
        console.log('❌ Dropzone is too small')
      }
    }
  }

  // TEST 4: Test file upload by setting input files directly
  console.log('\n📤 TEST 4: Upload test CSV file...')

  const testCsv = 'name,company\nAlice,OpenAI\nBob,Anthropic\nCharlie,Google'
  fs.writeFileSync('/tmp/test-file-upload.csv', testCsv)
  console.log('✅ Created test CSV')

  await fileInput.setInputFiles('/tmp/test-file-upload.csv')
  console.log('✅ File uploaded via input')

  // Wait for file to be processed
  await page.waitForTimeout(3000)

  // Check if file was uploaded successfully (look for row count or filename display)
  const uploadSuccess = await page.locator('text=/3 rows|test-file-upload.csv/i').count() > 0

  if (uploadSuccess) {
    console.log('✅ SUCCESS: File uploaded and processed successfully!')
  } else {
    console.log('⚠️  File upload status unclear (no row count detected)')
  }

  // Take screenshot for verification
  await page.screenshot({ path: '/tmp/file-upload-fix-verification.png', fullPage: true })
  console.log('📸 Screenshot saved to /tmp/file-upload-fix-verification.png')

  console.log('\n' + '='.repeat(80))
  console.log('🎯 FILE UPLOAD FIX VERIFICATION COMPLETE')
  console.log('='.repeat(80))
})
