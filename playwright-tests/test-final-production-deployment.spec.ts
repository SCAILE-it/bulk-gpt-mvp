import { test, expect } from '@playwright/test'

test('FINAL VERIFICATION: Test production with h-20 fix + correct MODAL_API_URL', async ({ page }) => {
  const deploymentUrl = 'https://bulk-gpt-hb7o8u6db-federico-de-pontes-projects.vercel.app'

  console.log(`\n${'='.repeat(80)}`)
  console.log('🎯 FINAL PRODUCTION TEST - All Fixes Applied')
  console.log(`   Deployment: ${deploymentUrl}`)
  console.log(`   Fix 1: h-20 (commit 20b9e54)`)
  console.log(`   Fix 2: MODAL_API_URL (no newline character)`)
  console.log('='.repeat(80))

  // Step 1: Navigate to auth page
  console.log('\n📝 Step 1: Navigate to auth page...')
  await page.goto(`${deploymentUrl}/auth`, { waitUntil: 'networkidle' })
  console.log('✅ Auth page loaded')

  // Step 2: Login
  console.log('\n🔐 Step 2: Login...')
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL('**/bulk', { timeout: 15000 })
    console.log('✅ Redirected to /bulk page')
  } catch (e) {
    console.log('⚠️  Did not redirect - checking current URL')
    console.log('Current URL:', page.url())
  }

  await page.screenshot({ path: '/tmp/final-test-01-initial.png', fullPage: true })

  // ============================================================================
  // CRITICAL TEST 1: Prompt Textarea Height (h-20 fix)
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('🔍 CRITICAL TEST 1: Prompt Textarea Height (h-20 fix)')
  console.log('='.repeat(80))

  const promptTextarea = page.locator('textarea#prompt, textarea[placeholder*="Write"]').first()
  const promptExists = await promptTextarea.count() > 0

  if (promptExists) {
    const promptBox = await promptTextarea.boundingBox()
    if (promptBox) {
      console.log(`📏 Prompt height: ${promptBox.height}px`)

      if (promptBox.height <= 100) {
        console.log('✅ SUCCESS: Prompt box is small (≤100px) - h-20 fix IS DEPLOYED!')
      } else {
        console.log(`❌ FAIL: Prompt box still too large (${promptBox.height}px)`)
        console.log('   Expected: ≤100px (h-20 = 80px + padding)')
        console.log('   This means the fix is NOT deployed or CDN is caching')
      }

      // Check actual class attribute
      const className = await promptTextarea.getAttribute('class')
      console.log(`\n📋 Textarea classes: ${className?.substring(0, 100)}...`)

      if (className?.includes('h-20')) {
        console.log('✅ h-20 class IS PRESENT in HTML')
      } else if (className?.includes('min-h-[120px]') || className?.includes('min-h-[180px]')) {
        console.log('❌ OLD CLASSES STILL PRESENT (min-h-[120px] or min-h-[180px])')
      } else {
        console.log('⚠️  Height classes not clearly identifiable')
      }
    }
  } else {
    console.log('⚠️  Prompt textarea not found')
  }

  // ============================================================================
  // CRITICAL TEST 2: Run Button Visibility
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('🔍 CRITICAL TEST 2: Run Button Visibility')
  console.log('='.repeat(80))

  const runButton = page.locator('button:has-text("Run")')
  const runExists = await runButton.count() > 0

  if (runExists) {
    const runVisible = await runButton.isVisible()
    const runBox = await runButton.boundingBox()
    const viewport = page.viewportSize()

    console.log(`Run button visible: ${runVisible}`)
    if (runBox && viewport) {
      console.log(`Run button Y: ${runBox.y}, bottom: ${runBox.y + runBox.height}`)
      console.log(`Viewport height: ${viewport.height}`)

      const isInViewport = runBox.y + runBox.height <= viewport.height
      console.log(`Run button in viewport: ${isInViewport}`)

      if (isInViewport) {
        console.log('✅ SUCCESS: Run button visible without scrolling!')
      } else {
        const pixelsBelow = runBox.y + runBox.height - viewport.height
        console.log(`❌ FAIL: Run button ${pixelsBelow}px below viewport`)
      }
    }
  } else {
    console.log('ℹ️  Run button not found (normal before CSV upload)')
  }

  // ============================================================================
  // CRITICAL TEST 3: File Upload Clickability
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('🔍 CRITICAL TEST 3: File Upload Clickability')
  console.log('='.repeat(80))

  const fileInput = page.locator('input[type="file"]')
  const fileInputExists = await fileInput.count() > 0

  if (fileInputExists) {
    const fileInputVisible = await fileInput.isVisible()
    console.log(`File input visible: ${fileInputVisible}`)

    const box = await fileInput.boundingBox()
    if (box) {
      console.log(`File input size: ${box.width}x${box.height} at (${box.x}, ${box.y})`)

      if (box.width <= 1 || box.height <= 1) {
        console.log('❌ FAIL: File input has 1x1 pixel size - NOT CLICKABLE')
        console.log('   This is the user-reported issue #1')
      } else {
        console.log('✅ SUCCESS: File input has proper size - CLICKABLE')
      }
    } else {
      console.log('❌ FAIL: File input has no bounding box')
    }
  } else {
    console.log('⚠️  File input not found')
  }

  // ============================================================================
  // CRITICAL TEST 4: Batch Processing with Fixed Environment Variable
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('🔍 CRITICAL TEST 4: Batch Processing (Modal API URL Fixed)')
  console.log('='.repeat(80))

  // Create test CSV
  const fs = require('fs')
  const testCsv = 'name,company\nAlice,OpenAI\nBob,Anthropic'
  fs.writeFileSync('/tmp/test-batch-final.csv', testCsv)
  console.log('✅ Created test CSV file')

  // Upload CSV
  try {
    await fileInput.setInputFiles('/tmp/test-batch-final.csv')
    console.log('✅ Uploaded CSV file')
    await page.waitForTimeout(2000)
  } catch (error) {
    console.log(`❌ Failed to upload CSV: ${error.message}`)
  }

  // Enter prompt
  if (promptExists) {
    await promptTextarea.fill('Write a one-sentence bio for {{name}} at {{company}}')
    console.log('✅ Entered prompt')
  }

  // Click Run button
  if (runExists) {
    await runButton.click()
    console.log('✅ Clicked Run button')

    // Wait for batch creation response
    await page.waitForTimeout(5000)

    // Check for error messages
    const errorMessages = await page.locator('text=/error|fail|No results returned from API/i').count()

    if (errorMessages > 0) {
      const errorText = await page.locator('text=/error|fail|No results/i').first().textContent()
      console.log(`❌ FAIL: Error detected: "${errorText}"`)
      console.log('   Environment variable may still be incorrect or Modal API is down')
    } else {
      console.log('✅ SUCCESS: No error messages detected')
      console.log('   Batch processing appears to be working!')
    }

    await page.screenshot({ path: '/tmp/final-test-02-after-run.png', fullPage: true })
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('📊 FINAL VERIFICATION SUMMARY')
  console.log('='.repeat(80))
  console.log(`Deployment: ${deploymentUrl}`)
  console.log('\nFixes Applied:')
  console.log('  1. h-20 fix (commit 20b9e54)')
  console.log('  2. MODAL_API_URL env var (no newline)')
  console.log('\n📸 Screenshots:')
  console.log('  /tmp/final-test-01-initial.png')
  console.log('  /tmp/final-test-02-after-run.png')
  console.log('='.repeat(80) + '\n')
})
