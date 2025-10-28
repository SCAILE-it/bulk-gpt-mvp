import { test, expect } from '@playwright/test'
import * as fs from 'fs'

test('Test ACTUAL production: https://bulk-gpt-app.vercel.app', async ({ page }) => {
  console.log('\n' + '='.repeat(80))
  console.log('🌐 TESTING ACTUAL PRODUCTION')
  console.log('   URL: https://bulk-gpt-app.vercel.app')
  console.log('='.repeat(80))

  // Navigate to production auth
  console.log('\n📝 Step 1: Navigate to production auth page...')
  await page.goto('https://bulk-gpt-app.vercel.app/auth', { waitUntil: 'networkidle', timeout: 30000 })
  console.log('✅ Auth page loaded')

  await page.screenshot({ path: '/tmp/prod-test-01-auth.png', fullPage: true })

  // Login
  console.log('\n🔐 Step 2: Login...')
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  await page.waitForURL('**/bulk', { timeout: 20000 })
  console.log('✅ Redirected to /bulk page')

  await page.screenshot({ path: '/tmp/prod-test-02-bulk-initial.png', fullPage: true })

  // ============================================================================
  // TEST 1: Prompt Textarea Height
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('🔍 TEST 1: Prompt Textarea Height (h-20 fix)')
  console.log('='.repeat(80))

  const promptTextarea = page.locator('textarea').first()
  const promptBox = await promptTextarea.boundingBox()

  if (promptBox) {
    console.log(`📏 Prompt height: ${promptBox.height}px`)

    if (promptBox.height <= 100) {
      console.log('✅ SUCCESS: Prompt is small (≤100px) - h-20 fix IS DEPLOYED!')
    } else {
      console.log(`❌ FAIL: Prompt still large (${promptBox.height}px) - h-20 NOT deployed`)
    }

    // Check class
    const className = await promptTextarea.getAttribute('class')
    if (className?.includes('h-20')) {
      console.log('✅ Class contains h-20')
    } else if (className?.includes('min-h-[120px]') || className?.includes('min-h-[180px]')) {
      console.log('❌ OLD CLASSES still present (min-h-[120px] or min-h-[180px])')
    }
  }

  // ============================================================================
  // TEST 2: Run Button Visibility
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('🔍 TEST 2: Run Button Visibility')
  console.log('='.repeat(80))

  const runButton = page.locator('button:has-text("Run")')
  const runExists = await runButton.count() > 0

  if (runExists) {
    const runBox = await runButton.boundingBox()
    const viewport = page.viewportSize()

    if (runBox && viewport) {
      const isInViewport = runBox.y + runBox.height <= viewport.height
      console.log(`Run button Y: ${runBox.y}, Viewport: ${viewport.height}`)
      console.log(`In viewport: ${isInViewport}`)

      if (isInViewport) {
        console.log('✅ SUCCESS: Run button visible without scrolling')
      } else {
        console.log(`❌ FAIL: Run button ${runBox.y + runBox.height - viewport.height}px below viewport`)
      }
    }
  } else {
    console.log('ℹ️  Run button not found (normal before CSV upload)')
  }

  // ============================================================================
  // TEST 3: File Upload
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('🔍 TEST 3: File Upload & Batch Processing')
  console.log('='.repeat(80))

  // Create test CSV
  const testCsv = 'name,company\nAlice,OpenAI\nBob,Anthropic\nCharlie,Google'
  fs.writeFileSync('/tmp/test-production-batch.csv', testCsv)
  console.log('✅ Created test CSV')

  // Upload file
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('/tmp/test-production-batch.csv')
  console.log('✅ Uploaded CSV')

  await page.waitForTimeout(2000)

  // Enter prompt
  await promptTextarea.fill('Write a one-sentence bio for {{name}} at {{company}}')
  console.log('✅ Entered prompt')

  await page.screenshot({ path: '/tmp/prod-test-03-before-run.png', fullPage: true })

  // Click Run
  await runButton.click()
  console.log('✅ Clicked Run button')

  // Wait for processing
  await page.waitForTimeout(8000)

  await page.screenshot({ path: '/tmp/prod-test-04-after-run.png', fullPage: true })

  // Check for errors
  const errorText = await page.locator('text=/error|fail|No results returned/i').count()

  console.log('\n' + '='.repeat(80))
  console.log('📊 BATCH PROCESSING RESULT')
  console.log('='.repeat(80))

  if (errorText > 0) {
    const errorMsg = await page.locator('text=/error|fail|No results/i').first().textContent()
    console.log(`❌ ERROR DETECTED: "${errorMsg}"`)
    console.log('   Environment variable may still be wrong or Modal API is down')
  } else {
    console.log('✅ NO ERROR MESSAGES - Batch appears to be working!')
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('📊 PRODUCTION TEST SUMMARY')
  console.log('='.repeat(80))
  console.log(`Prompt height: ${promptBox ? promptBox.height + 'px' : 'N/A'}`)
  console.log(`Error messages: ${errorText}`)
  console.log('\n📸 Screenshots saved:')
  console.log('   /tmp/prod-test-01-auth.png')
  console.log('   /tmp/prod-test-02-bulk-initial.png')
  console.log('   /tmp/prod-test-03-before-run.png')
  console.log('   /tmp/prod-test-04-after-run.png')
  console.log('='.repeat(80) + '\n')
})
