import { test, expect } from '@playwright/test'

test('Test production Vercel deployment - verify all reported issues', async ({ page }) => {
  console.log('🌐 Testing PRODUCTION Vercel: https://bulk-gpt-app.vercel.app\n')

  // Navigate to production auth page
  console.log('📝 Step 1: Navigate to production auth page...')
  await page.goto('https://bulk-gpt-app.vercel.app/auth')
  await page.waitForLoadState('networkidle')
  console.log('✅ Auth page loaded')

  // Take screenshot of auth page
  await page.screenshot({ path: '/tmp/prod-01-auth-page.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/prod-01-auth-page.png')

  // Login
  console.log('\n🔐 Step 2: Login...')
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL('**/bulk', { timeout: 15000 })
    console.log('✅ Redirected to /bulk page')
  } catch (e) {
    console.log('⚠️  Did not redirect to /bulk - checking current URL')
    console.log('Current URL:', page.url())
    await page.screenshot({ path: '/tmp/prod-02-after-login.png', fullPage: true })
  }

  // Take screenshot of bulk page
  await page.screenshot({ path: '/tmp/prod-03-bulk-page-initial.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/prod-03-bulk-page-initial.png')

  // ISSUE 1: Check file upload button clickability
  console.log('\n🔍 ISSUE 1: File Upload Button Clickability')

  const uploadButton = page.locator('button:has-text("Upload")')
  const changeFileButton = page.locator('button:has-text("Change file")')
  const fileInput = page.locator('input[type="file"]')

  const uploadButtonExists = await uploadButton.count() > 0
  const changeFileExists = await changeFileButton.count() > 0
  const fileInputExists = await fileInput.count() > 0

  console.log(`Upload button exists: ${uploadButtonExists}`)
  console.log(`Change file button exists: ${changeFileExists}`)
  console.log(`File input exists: ${fileInputExists}`)

  if (fileInputExists) {
    const fileInputVisible = await fileInput.isVisible()
    const fileInputDisabled = await fileInput.isDisabled()
    console.log(`File input visible: ${fileInputVisible}`)
    console.log(`File input disabled: ${fileInputDisabled}`)

    // Check bounding box
    const box = await fileInput.boundingBox()
    if (box) {
      console.log(`File input position: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`)
      if (box.width === 0 || box.height === 0) {
        console.log('❌ FAIL: File input has 0 width/height - not clickable')
      }
    } else {
      console.log('❌ FAIL: File input has no bounding box - not in viewport')
    }
  }

  // ISSUE 2: Check prompt textarea height
  console.log('\n🔍 ISSUE 2: Prompt Textarea Height (Fixed to h-20)')

  const promptTextarea = page.locator('textarea#prompt, textarea[placeholder*="Write a bio"]')
  const promptExists = await promptTextarea.count() > 0

  if (promptExists) {
    const promptBox = await promptTextarea.boundingBox()
    if (promptBox) {
      console.log(`Prompt height: ${promptBox.height}px`)
      if (promptBox.height <= 100) {
        console.log('✅ PASS: Prompt box is small (≤100px)')
      } else {
        console.log(`❌ FAIL: Prompt box too large (${promptBox.height}px, expected ≤100px)`)
      }
    }
  } else {
    console.log('⚠️  Prompt textarea not found')
  }

  // ISSUE 3: Check if Run button is visible without scrolling
  console.log('\n🔍 ISSUE 3: Run Button Visibility (Should be visible without scrolling)')

  const runButton = page.locator('button:has-text("Run")')
  const testButton = page.locator('button:has-text("Test")')

  const runExists = await runButton.count() > 0
  const testExists = await testButton.count() > 0

  console.log(`Run button exists: ${runExists}`)
  console.log(`Test button exists: ${testExists}`)

  if (runExists) {
    const runVisible = await runButton.isVisible()
    const runBox = await runButton.boundingBox()
    const viewport = page.viewportSize()

    console.log(`Run button visible: ${runVisible}`)
    if (runBox && viewport) {
      console.log(`Run button position: y=${runBox.y}, viewport height=${viewport.height}`)
      const isInViewport = runBox.y + runBox.height <= viewport.height
      console.log(`Run button in viewport: ${isInViewport}`)

      if (!isInViewport) {
        console.log(`❌ FAIL: Run button is ${runBox.y + runBox.height - viewport.height}px below viewport`)
      } else {
        console.log('✅ PASS: Run button visible without scrolling')
      }
    }
  } else {
    console.log('⚠️  Run button not found - may need to upload CSV first')
  }

  // Check scroll container
  console.log('\n🔍 Checking Left Sidebar Scroll Container')
  const leftSidebar = page.locator('.flex.flex-col').first()
  const leftSidebarBox = await leftSidebar.boundingBox()
  if (leftSidebarBox) {
    console.log(`Left sidebar height: ${leftSidebarBox.height}px`)
  }

  // Take full-page screenshot showing scroll issue
  await page.screenshot({ path: '/tmp/prod-04-scroll-issue.png', fullPage: true })
  console.log('📸 Screenshot: /tmp/prod-04-scroll-issue.png')

  // ISSUE 4: Check Modal API environment variable
  console.log('\n🔍 ISSUE 4: Modal API Configuration')
  console.log('Expected Modal API URL: https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run')
  console.log('⚠️  Cannot check environment variables from frontend - need to check Vercel dashboard')

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 PRODUCTION VERIFICATION SUMMARY')
  console.log('='.repeat(80))
  console.log('\n📁 Screenshots saved:')
  console.log('  - /tmp/prod-01-auth-page.png')
  console.log('  - /tmp/prod-02-after-login.png (if login failed)')
  console.log('  - /tmp/prod-03-bulk-page-initial.png')
  console.log('  - /tmp/prod-04-scroll-issue.png')
  console.log('\n💡 Review screenshots to see actual production state')
})
