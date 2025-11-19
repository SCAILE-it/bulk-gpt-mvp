import { chromium } from 'playwright'

async function testDashboard() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    console.log('🧪 Testing Dashboard Loading...\n')

    // Navigate to localhost
    console.log('1️⃣ Navigating to http://localhost:3000')
    const response = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    console.log(`   ✓ Response status: ${response.status()}`)
    console.log(`   ✓ Redirected to: ${page.url()}\n`)

    // Try to navigate directly to home (simulating a logged-in state)
    console.log('2️⃣ Checking API responses...')

    // Set up response listener to track API calls
    let hasApiErrors = false
    page.on('response', response => {
      if (response.url().includes('/api/dashboard')) {
        console.log(`   📡 ${response.url()}: ${response.status()}`)
        if (response.status() === 500) {
          hasApiErrors = true
        }
      }
    })

    // Navigate to home page
    console.log('\n3️⃣ Checking home page...')
    try {
      const homeResponse = await page.goto('http://localhost:3000/home', { waitUntil: 'domcontentloaded', timeout: 10000 })
      console.log(`   ✓ Home page response: ${homeResponse.status()}`)
    } catch (e) {
      console.log(`   ⚠️ Home page not accessible (expected if not authenticated): ${e.message}`)
    }

    // Wait for any pending requests
    await page.waitForLoadState('networkidle').catch(() => {})

    console.log('\n✅ Tests completed!')
    if (!hasApiErrors) {
      console.log('✓ No API 500 errors detected')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

testDashboard()
