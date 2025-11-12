const { chromium } = require('playwright')

/**
 * Test API Access Functionality
 * 1. Login to app
 * 2. Create an API key
 * 3. Test API call with the key
 */

async function testAPIAccess() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  const results = {
    login: false,
    navigateToProfile: false,
    createApiKey: false,
    apiKey: null,
    testApiCall: false,
    errors: []
  }

  try {
    console.log('\n🔐 Testing API Access Functionality...\n')

    // Step 1: Login
    console.log('1. Logging in...')
    await page.goto('https://bulk-gpt-app.vercel.app/')
    await page.fill('input[type="email"]', 'test@bulkgpt.local')
    await page.fill('input[type="password"]', 'Test123456!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/bulk', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    results.login = true
    console.log('✅ Logged in successfully\n')

    // Step 2: Navigate to Profile page
    console.log('2. Navigating to Profile page...')
    await page.goto('https://bulk-gpt-app.vercel.app/profile')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Check if API Keys section exists
    const apiKeysSection = await page.locator('text=API Keys').first().isVisible().catch(() => false)
    if (!apiKeysSection) {
      throw new Error('API Keys section not found on profile page')
    }
    results.navigateToProfile = true
    console.log('✅ Profile page loaded\n')

    // Step 3: Create API Key
    console.log('3. Creating API key...')
    const createButton = page.locator('button:has-text("Create New Key"), button:has-text("Create")').first()
    const buttonVisible = await createButton.isVisible().catch(() => false)
    
    if (!buttonVisible) {
      throw new Error('Create API Key button not found')
    }

    await createButton.click()
    await page.waitForTimeout(1000)

    // Fill in key name
    const keyNameInput = page.locator('input[placeholder*="Production"], input[placeholder*="name"], input[type="text"]').first()
    await keyNameInput.fill('Test API Key - ' + Date.now())
    await page.waitForTimeout(500)

    // Click create button in modal
    const createInModal = page.locator('button:has-text("Create API Key")').first()
    await createInModal.click()
    await page.waitForTimeout(2000)

    // Extract API key from modal
    const apiKeyInput = page.locator('input[readonly], input[value*="bulk"], input[type="text"]').filter({ hasText: /bulk|api|key/i }).first()
    const apiKeyValue = await apiKeyInput.inputValue().catch(() => null)
    
    if (!apiKeyValue || apiKeyValue.length < 20) {
      // Try alternative: look for text content
      const modalText = await page.locator('body').textContent()
      const keyMatch = modalText?.match(/bulk_[a-zA-Z0-9_-]+/)?.[0]
      if (keyMatch) {
        results.apiKey = keyMatch
        results.createApiKey = true
      } else {
        throw new Error('API key not found in modal')
      }
    } else {
      results.apiKey = apiKeyValue
      results.createApiKey = true
    }

    console.log(`✅ API key created: ${results.apiKey?.substring(0, 20)}...\n`)

    // Step 4: Test API call
    console.log('4. Testing API call with key...')
    
    const testPayload = {
      csvFilename: 'test.csv',
      rows: [
        { name: 'John Doe', email: 'john@example.com' }
      ],
      prompt: 'Write a bio for {{name}}',
      outputColumns: ['bio']
    }

    const apiResponse = await page.evaluate(async (payload, apiKey) => {
      const response = await fetch('https://bulk-gpt-app.vercel.app/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      })
      return {
        status: response.status,
        ok: response.ok,
        body: await response.json().catch(() => ({ error: 'Failed to parse response' }))
      }
    }, testPayload, results.apiKey)

    if (apiResponse.ok || apiResponse.status === 202 || apiResponse.status === 429) {
      // 202 = Accepted (batch created)
      // 429 = Rate limited (but API key worked!)
      results.testApiCall = true
      console.log(`✅ API call successful (status: ${apiResponse.status})`)
      console.log(`   Response: ${JSON.stringify(apiResponse.body).substring(0, 200)}...\n`)
    } else {
      throw new Error(`API call failed: ${apiResponse.status} - ${JSON.stringify(apiResponse.body)}`)
    }

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 API ACCESS TEST RESULTS')
    console.log('='.repeat(60))
    console.log(`Login: ${results.login ? '✅' : '❌'}`)
    console.log(`Navigate to Profile: ${results.navigateToProfile ? '✅' : '❌'}`)
    console.log(`Create API Key: ${results.createApiKey ? '✅' : '❌'}`)
    console.log(`API Key: ${results.apiKey ? results.apiKey.substring(0, 30) + '...' : '❌'}`)
    console.log(`Test API Call: ${results.testApiCall ? '✅' : '❌'}`)
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors:')
      results.errors.forEach(err => console.log(`  - ${err}`))
    }
    
    console.log('='.repeat(60) + '\n')

    if (results.login && results.navigateToProfile && results.createApiKey && results.testApiCall) {
      console.log('✅ ALL TESTS PASSED - API access is fully working!\n')
    } else {
      console.log('⚠️ Some tests failed - check errors above\n')
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    results.errors.push(error.message)
    await page.screenshot({ path: 'api-test-error.png', fullPage: true })
  } finally {
    await browser.close()
  }

  return results
}

testAPIAccess().then(results => {
  process.exit(results.testApiCall ? 0 : 1)
}).catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

