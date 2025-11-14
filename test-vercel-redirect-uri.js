/**
 * Test Google OAuth on Vercel production to capture exact redirect URI
 */

const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log('=== Testing Google OAuth on Vercel ===\n')
    console.log('This will capture the exact redirect URI being sent to Google\n')

    const baseUrl = 'https://bulk-gpt.com'
    await page.goto(baseUrl, { waitUntil: 'networkidle' })

    // Login if needed
    if (page.url().includes('/auth')) {
      console.log('1. Logging in...')
      await page.locator('input[type="email"]').fill('test@bulkgpt.local')
      await page.locator('input[type="password"]').fill('Test123456!')
      await page.locator('button[type="submit"]').click()
      await page.waitForNavigation({ waitUntil: 'networkidle' })
      console.log('   ✓ Logged in\n')
    }

    // Navigate to bulk page
    console.log('2. Navigating to bulk page...')
    await page.goto(`${baseUrl}/bulk`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('   ✓ On bulk page\n')

    // Switch to Google Sheets tab
    console.log('3. Switching to Google Sheets tab...')
    const sheetsTab = page.locator('[role="tab"]:has-text("Google Sheets")').first()
    await sheetsTab.click({ force: true })
    await page.waitForTimeout(3000)
    console.log('   ✓ Switched to Google Sheets tab\n')

    // Monitor network requests to capture OAuth redirect URI
    const oauthUrls = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('accounts.google.com') && (url.includes('oauth') || url.includes('auth'))) {
        oauthUrls.push(url)
      }
    })

    // Click "Pick from Google Drive" button
    console.log('4. Clicking "Pick from Google Drive" button...')
    const pickButton = page.locator('button:has-text("Pick from Google Drive")').first()
    
    if (await pickButton.count() === 0) {
      console.log('   ✗ Button not found')
      await page.screenshot({ path: 'vercel-test-no-button.png', fullPage: true })
      return
    }

    await pickButton.click()
    console.log('   ✓ Clicked button, waiting for OAuth popup...\n')

    // Wait for OAuth popup
    await page.waitForTimeout(3000)
    const pages = await browser.pages()
    const oauthPage = pages.find(p => p.url().includes('accounts.google.com'))

    if (oauthPage) {
      console.log('5. OAuth popup detected!')
      const oauthUrl = oauthPage.url()
      console.log(`   URL: ${oauthUrl}\n`)

      // Extract redirect_uri from URL
      try {
        const urlObj = new URL(oauthUrl)
        const redirectUri = urlObj.searchParams.get('redirect_uri')
        
        if (redirectUri) {
          const decodedRedirectUri = decodeURIComponent(redirectUri)
          console.log('🔍 CAPTURED REDIRECT URI:')
          console.log(`   Encoded: ${redirectUri}`)
          console.log(`   Decoded: ${decodedRedirectUri}\n`)
          
          console.log('📋 ADD THIS TO GOOGLE CLOUD CONSOLE:')
          console.log('   1. Go to: https://console.cloud.google.com/apis/credentials')
          console.log('   2. Select project with Client ID: 466128555451-uobrlom0thvcnfkniaacre1gbajpevpf')
          console.log('   3. Click on your OAuth 2.0 Client ID')
          console.log('   4. Under "Authorized redirect URIs", add:')
          console.log(`      ${decodedRedirectUri}\n`)
        } else {
          console.log('⚠️  Could not extract redirect_uri from URL')
          console.log('   Full URL:', oauthUrl)
        }
      } catch (err) {
        console.log('⚠️  Error parsing URL:', err.message)
        console.log('   Full URL:', oauthUrl)
      }

      // Check for error message
      await oauthPage.waitForTimeout(2000)
      const pageContent = await oauthPage.locator('body').textContent()
      
      if (pageContent?.includes('redirect_uri_mismatch')) {
        console.log('\n❌ redirect_uri_mismatch error detected')
        console.log('   The redirect URI above needs to be added to Google Cloud Console')
      } else if (pageContent?.includes('Sign in') || pageContent?.includes('consent')) {
        console.log('\n✅ OAuth consent screen shown (no redirect_uri_mismatch error)')
        console.log('   OAuth flow is working correctly!')
      }

      // Save screenshot of OAuth page
      await oauthPage.screenshot({ path: 'vercel-oauth-popup.png', fullPage: true })
      console.log('\n   Screenshot saved: vercel-oauth-popup.png')
    } else {
      console.log('⚠️  No OAuth popup detected')
      console.log('   Check console for errors')
    }

    // Check network requests
    await page.waitForTimeout(2000)
    if (oauthUrls.length > 0) {
      console.log(`\n📡 Captured ${oauthUrls.length} OAuth request(s)`)
      oauthUrls.forEach((url, i) => {
        console.log(`\n   Request ${i + 1}:`)
        try {
          const urlObj = new URL(url)
          const redirectUri = urlObj.searchParams.get('redirect_uri')
          if (redirectUri) {
            console.log(`   Redirect URI: ${decodeURIComponent(redirectUri)}`)
          }
        } catch (err) {
          console.log(`   URL: ${url.substring(0, 200)}...`)
        }
      })
    }

    await page.screenshot({ path: 'vercel-test-result.png', fullPage: true })
    console.log('\n   Screenshot saved: vercel-test-result.png')

  } catch (error) {
    console.error('\n✗ Error:', error)
    await page.screenshot({ path: 'vercel-test-error.png', fullPage: true })
  } finally {
    console.log('\nBrowser will stay open for 60 seconds for inspection...')
    console.log('Check the OAuth popup URL to see the redirect_uri parameter')
    await page.waitForTimeout(60000)
    await browser.close()
  }
})()

