/**
 * Test to capture the exact redirect URI being sent to Google OAuth
 * This will help identify what needs to be configured in Google Cloud Console
 */

const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log('=== Capturing Google OAuth Redirect URI ===\n')

    await page.goto('https://bulk-gpt.com', { waitUntil: 'networkidle' })

    if (page.url().includes('/auth')) {
      await page.locator('input[type="email"]').fill('test@bulkgpt.local')
      await page.locator('input[type="password"]').fill('Test123456!')
      await page.locator('button[type="submit"]').click()
      await page.waitForNavigation({ waitUntil: 'networkidle' })
    }

    await page.goto('https://bulk-gpt.com/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Click Google Sheets tab
    const sheetsTab = page.locator('[role="tab"]:has-text("Google Sheets")').first()
    await sheetsTab.click({ force: true })
    await page.waitForTimeout(3000)

    // Monitor network requests to capture the OAuth redirect URI
    const oauthRequests = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('accounts.google.com') && (url.includes('oauth') || url.includes('auth'))) {
        oauthRequests.push({
          url: url,
          method: req.method(),
          headers: req.headers()
        })
      }
    })

    // Click "Pick from Google Drive" button
    const pickButton = page.locator('button:has-text("Pick from Google Drive")').first()
    await pickButton.click()
    console.log('✓ Clicked "Pick from Google Drive" button\n')

    // Wait for OAuth popup
    await page.waitForTimeout(2000)
    const pages = await browser.pages()
    const oauthPage = pages.find(p => p.url().includes('accounts.google.com'))

    if (oauthPage) {
      console.log('OAuth popup opened')
      console.log(`URL: ${oauthPage.url()}\n`)

      // Extract redirect_uri from URL
      const urlObj = new URL(oauthPage.url())
      const redirectUri = urlObj.searchParams.get('redirect_uri')
      
      if (redirectUri) {
        console.log('🔍 CAPTURED REDIRECT URI:')
        console.log(`   ${decodeURIComponent(redirectUri)}\n`)
        console.log('📋 Add this EXACT URI to Google Cloud Console:')
        console.log('   1. Go to: https://console.cloud.google.com/')
        console.log('   2. APIs & Services → Credentials')
        console.log('   3. Click your OAuth 2.0 Client ID')
        console.log('   4. Under "Authorized redirect URIs", add:')
        console.log(`      ${decodeURIComponent(redirectUri)}\n`)
      } else {
        console.log('⚠️  Could not extract redirect_uri from URL')
        console.log('   Full URL:', oauthPage.url())
      }

      // Check for error message
      const pageContent = await oauthPage.locator('body').textContent()
      if (pageContent?.includes('redirect_uri_mismatch')) {
        console.log('\n❌ redirect_uri_mismatch error detected')
        console.log('   The redirect URI above needs to be added to Google Cloud Console')
      }
    }

    // Also check network requests
    await page.waitForTimeout(2000)
    if (oauthRequests.length > 0) {
      console.log(`\n📡 Captured ${oauthRequests.length} OAuth request(s):`)
      oauthRequests.forEach((req, i) => {
        console.log(`\n   Request ${i + 1}:`)
        console.log(`   URL: ${req.url}`)
        const urlObj = new URL(req.url)
        const redirectUri = urlObj.searchParams.get('redirect_uri')
        if (redirectUri) {
          console.log(`   Redirect URI: ${decodeURIComponent(redirectUri)}`)
        }
      })
    }

    await page.screenshot({ path: 'capture-redirect-uri.png', fullPage: true })
    console.log('\nScreenshot saved: capture-redirect-uri.png')

  } catch (error) {
    console.error('\n✗ Error:', error)
  } finally {
    console.log('\nBrowser will stay open for 30 seconds for inspection...')
    await page.waitForTimeout(30000)
    await browser.close()
  }
})()

