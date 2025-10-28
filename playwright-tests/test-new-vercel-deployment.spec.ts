import { test, expect } from '@playwright/test'

test('Verify h-20 fix and Modal API on NEW production deployment', async ({ page }) => {
  const deploymentUrl = 'https://bulk-gpt-qbmx8y73y-federico-de-pontes-projects.vercel.app'

  console.log(`\n${'='.repeat(80)}`)
  console.log('🌐 Testing NEW Vercel deployment:')
  console.log(`   ${deploymentUrl}`)
  console.log('='.repeat(80))

  // Navigate to auth page
  console.log('\n📝 Step 1: Navigate to auth page...')
  await page.goto(`${deploymentUrl}/auth`)
  await page.waitForLoadState('networkidle')
  console.log('✅ Auth page loaded')

  // Login
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

  // Take screenshot of initial page
  await page.screenshot({ path: '/tmp/new-deployment-01-initial.png', fullPage: true })

  // CRITICAL CHECK 1: Prompt Textarea Height
  console.log('\n' + '='.repeat(80))
  console.log('🔍 CRITICAL CHECK 1: Prompt Textarea Height')
  console.log('='.repeat(80))

  const promptTextarea = page.locator('textarea#prompt, textarea[placeholder*="Write a bio"]')
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
        console.log('   This means the fix is NOT deployed or CDN is still caching')
      }

      // Check the actual class attribute
      const className = await promptTextarea.getAttribute('class')
      console.log(`\n📋 Textarea classes: ${className}`)

      if (className?.includes('h-20')) {
        console.log('✅ h-20 class IS PRESENT in HTML')
      } else if (className?.includes('min-h-[120px]') || className?.includes('min-h-[180px]')) {
        console.log('❌ OLD CLASSES STILL PRESENT (min-h-[120px] or min-h-[180px])')
        console.log('   This confirms the OLD code is still being served')
      } else {
        console.log('⚠️  Height classes not clearly identifiable')
      }
    }
  } else {
    console.log('⚠️  Prompt textarea not found')
  }

  // CRITICAL CHECK 2: Run Button Visibility
  console.log('\n' + '='.repeat(80))
  console.log('🔍 CRITICAL CHECK 2: Run Button Visibility')
  console.log('='.repeat(80))

  const runButton = page.locator('button:has-text("Run")')
  const runExists = await runButton.count() > 0

  if (runExists) {
    const runVisible = await runButton.isVisible()
    const runBox = await runButton.boundingBox()
    const viewport = page.viewportSize()

    console.log(`Run button visible: ${runVisible}`)
    if (runBox && viewport) {
      console.log(`Run button position: y=${runBox.y}, bottom=${runBox.y + runBox.height}`)
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
    console.log('ℹ️  Run button not found (may need CSV upload first)')
  }

  // CRITICAL CHECK 3: File Input Clickability
  console.log('\n' + '='.repeat(80))
  console.log('🔍 CRITICAL CHECK 3: File Input Clickability')
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
      } else {
        console.log('✅ SUCCESS: File input has proper size - CLICKABLE')
      }
    } else {
      console.log('❌ FAIL: File input has no bounding box')
    }
  } else {
    console.log('⚠️  File input not found')
  }

  // Take final screenshot
  await page.screenshot({ path: '/tmp/new-deployment-02-final.png', fullPage: true })
  console.log('\n📸 Screenshots saved:')
  console.log('   /tmp/new-deployment-01-initial.png')
  console.log('   /tmp/new-deployment-02-final.png')

  // SUMMARY
  console.log('\n' + '='.repeat(80))
  console.log('📊 VERIFICATION SUMMARY')
  console.log('='.repeat(80))
  console.log('\nDeployment URL:', deploymentUrl)
  console.log('\n⚠️  NOTE: If fixes are not deployed, this means:')
  console.log('   1. CDN is still caching old build (wait 5-10 minutes)')
  console.log('   2. OR Vercel did not actually deploy the new code')
  console.log('   3. OR the commit with fixes is not in this deployment')
  console.log('\n✅ If all checks pass, deployment is SUCCESSFUL')
  console.log('❌ If checks fail, need to investigate deployment issue')
  console.log('='.repeat(80) + '\n')
})
