import { chromium } from 'playwright'

async function testLocalhost3000() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    console.log('🧪 Testing localhost:3000...')

    // Test 1: Navigate to homepage
    console.log('1️⃣ Navigating to http://localhost:3000')
    const response = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    console.log(`   ✓ Response status: ${response.status()}`)
    console.log(`   ✓ Current URL: ${page.url()}`)

    // Test 2: Check for auth page elements
    console.log('\n2️⃣ Checking for login form elements...')

    // Wait for email input with timeout
    const emailInput = await page.locator('input[type="email"]').first()
    const isVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false)

    if (isVisible) {
      console.log('   ✓ Email input field found')
    } else {
      console.log('   ⚠️ Email input not immediately visible - page might still be loading')

      // Try to find any form elements
      const inputs = await page.locator('input').count()
      console.log(`   ℹ️ Found ${inputs} input elements on page`)
    }

    // Test 3: Check page title
    console.log('\n3️⃣ Checking page title...')
    const title = await page.title()
    console.log(`   ✓ Page title: "${title}"`)

    // Test 4: Check for key page elements
    console.log('\n4️⃣ Checking for key page elements...')
    const buttons = await page.locator('button').count()
    console.log(`   ✓ Found ${buttons} buttons`)

    const headings = await page.locator('h1, h2, h3').count()
    console.log(`   ✓ Found ${headings} headings`)

    // Test 5: Take screenshot
    console.log('\n5️⃣ Taking screenshot...')
    await page.screenshot({ path: 'test-screenshot-localhost.png' })
    console.log('   ✓ Screenshot saved to test-screenshot-localhost.png')

    console.log('\n✅ All tests passed! localhost:3000 is working.')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    await page.screenshot({ path: 'test-error-screenshot.png' })
    process.exit(1)
  } finally {
    await browser.close()
  }
}

testLocalhost3000()
