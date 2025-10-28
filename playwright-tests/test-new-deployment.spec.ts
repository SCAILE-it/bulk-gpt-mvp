import { test, expect } from '@playwright/test'

test('Verify h-20 fix on NEW Vercel deployment', async ({ page }) => {
  console.log('🌐 Testing NEW deployment: https://bulk-gpt-brghw2f5i-federico-de-pontes-projects.vercel.app\n')

  // Navigate to new deployment
  console.log('📝 Step 1: Navigate to new deployment auth page...')
  await page.goto('https://bulk-gpt-brghw2f5i-federico-de-pontes-projects.vercel.app/auth')
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

  // Check prompt textarea height
  console.log('\n🔍 CRITICAL CHECK: Prompt Textarea Height')

  const promptTextarea = page.locator('textarea#prompt, textarea[placeholder*="Write a bio"]')
  const promptExists = await promptTextarea.count() > 0

  if (promptExists) {
    const promptBox = await promptTextarea.boundingBox()
    if (promptBox) {
      console.log(`📏 Prompt height: ${promptBox.height}px`)

      if (promptBox.height <= 100) {
        console.log('✅ SUCCESS: Prompt box is small (≤100px) - h-20 fix DEPLOYED!')
      } else {
        console.log(`❌ FAIL: Prompt box still too large (${promptBox.height}px) - h-20 fix NOT deployed`)
      }
    }
  } else {
    console.log('⚠️  Prompt textarea not found')
  }

  // Check Run button visibility
  console.log('\n🔍 Check: Run Button Visibility')

  const runButton = page.locator('button:has-text("Run")')
  const runExists = await runButton.count() > 0

  if (runExists) {
    const runVisible = await runButton.isVisible()
    const runBox = await runButton.boundingBox()
    const viewport = page.viewportSize()

    console.log(`Run button visible: ${runVisible}`)
    if (runBox && viewport) {
      const isInViewport = runBox.y + runBox.height <= viewport.height
      console.log(`Run button in viewport: ${isInViewport}`)

      if (isInViewport) {
        console.log('✅ SUCCESS: Run button visible without scrolling!')
      } else {
        console.log(`❌ FAIL: Run button ${runBox.y + runBox.height - viewport.height}px below viewport`)
      }
    }
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/new-deployment-verification.png', fullPage: true })
  console.log('\n📸 Screenshot saved: /tmp/new-deployment-verification.png')

  console.log('\n' + '='.repeat(80))
  console.log('🎉 TEST COMPLETE')
  console.log('='.repeat(80))
})
