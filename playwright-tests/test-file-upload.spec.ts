import { test, expect } from '@playwright/test'

test('Test file upload clickability on production', async ({ page }) => {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 TESTING FILE UPLOAD CLICK ABILITY')
  console.log('   URL: https://bulk-gpt-app.vercel.app')
  console.log('='.repeat(80))

  // Navigate and login
  await page.goto('https://bulk-gpt-app.vercel.app/auth')
  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/bulk', { timeout: 15000 })
  console.log('✅ Logged in')

  // Wait for page to fully load
  await page.waitForTimeout(2000)

  // Find the file input
  const fileInput = page.locator('input[type="file"]')
  const fileInputCount = await fileInput.count()
  console.log(`\n📝 Found ${fileInputCount} file input(s)`)

  if (fileInputCount > 0) {
    for (let i = 0; i < fileInputCount; i++) {
      const input = fileInput.nth(i)
      const box = await input.boundingBox()
      const isVisible = await input.isVisible()

      console.log(`\nInput #${i + 1}:`)
      console.log(`  Visible: ${isVisible}`)
      if (box) {
        console.log(`  Size: ${box.width}x${box.height}`)
        console.log(`  Position: (${box.x}, ${box.y})`)

        if (box.width <= 1 || box.height <= 1) {
          console.log(`  ⚠️  WARNING: Input has 1x1 pixel size - NOT CLICKABLE`)
        } else {
          console.log(`  ✅ Input has proper size - should be clickable`)
        }
      } else {
        console.log(`  ❌ No bounding box`)
      }
    }
  }

  // Find the dropzone area
  console.log('\n🔍 Looking for dropzone area...')
  const dropzoneText = page.locator('text="Drop your CSV file here"')
  const dropzoneExists = await dropzoneText.count() > 0

  if (dropzoneExists) {
    console.log('✅ Found dropzone text')

    // Get the parent div (should be the dropzone)
    const dropzone = dropzoneText.locator('..').locator('..')
    const dropzoneBox = await dropzone.boundingBox()

    if (dropzoneBox) {
      console.log(`Dropzone size: ${dropzoneBox.width}x${dropzoneBox.height}`)
      console.log(`Dropzone position: (${dropzoneBox.x}, ${dropzoneBox.y})`)
    }
  }

  // Try clicking the upload area
  console.log('\n🖱️  Attempting to click upload area...')
  try {
    await page.click('text="or click anywhere to browse"', { timeout: 5000 })
    console.log('✅ Clicked "click anywhere to browse" text')

    await page.waitForTimeout(1000)

    // Check if file picker would open (we can't actually interact with native file picker in headless)
    console.log('ℹ️  File picker should have opened (can\'t verify in headless mode)')
  } catch (error) {
    console.log(`❌ Failed to click: ${error.message}`)
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/file-upload-test.png', fullPage: true })
  console.log('\n📸 Screenshot saved: /tmp/file-upload-test.png')

  console.log('\n' + '='.repeat(80))
})
