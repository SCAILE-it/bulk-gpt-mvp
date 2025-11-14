/**
 * Test Google Picker "Pick from Drive" functionality
 * Tests if OAuth redirect_uri_mismatch error is resolved
 */

const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log('=== Testing Google Picker "Pick from Drive" ===\n')

    // Navigate to app
    console.log('1. Navigating to app...')
    const baseUrl = process.env.TEST_URL || 'https://bulk-gpt.com'
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    console.log(`   ✓ Loaded: ${baseUrl}\n`)

    // Login if needed
    if (page.url().includes('/auth')) {
      console.log('2. Logging in...')
      await page.locator('input[type="email"]').fill('test@bulkgpt.local')
      await page.locator('input[type="password"]').fill('Test123456!')
      await page.locator('button[type="submit"]').click()
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 })
      console.log('   ✓ Logged in\n')
    }

    // Navigate to bulk page if not already there
    if (!page.url().includes('/bulk')) {
      console.log('3. Navigating to bulk page...')
      await page.goto(`${baseUrl}/bulk`, { waitUntil: 'networkidle' })
      console.log('   ✓ On bulk page\n')
    }

    // Close any modals/overlays that might be blocking
    console.log('4. Checking for modals/overlays...')
    const closeButtons = page.locator('button[aria-label="Close"], button:has-text("Close"), [role="button"]:has-text("×")')
    const closeCount = await closeButtons.count()
    if (closeCount > 0) {
      console.log(`   Found ${closeCount} close button(s), clicking...`)
      await closeButtons.first().click()
      await page.waitForTimeout(500)
    }
    
    // Switch to Google Sheets tab
    console.log('5. Switching to Google Sheets tab...')
    const sheetsTab = page.locator('button:has-text("Google Sheets"), [role="tab"]:has-text("Google Sheets")').first()
    await sheetsTab.waitFor({ state: 'visible', timeout: 5000 })
    await sheetsTab.click({ force: true })
    await page.waitForTimeout(1000)
    console.log('   ✓ Switched to Google Sheets tab\n')

    // Click "Pick from Drive" button
    console.log('6. Clicking "Pick from Google Drive" button...')
    const pickFromDriveButton = page.locator('button:has-text("Pick from Google Drive"), button[aria-label*="Pick"], button:has-text("Pick from Drive")').first()
    
    if (await pickFromDriveButton.count() === 0) {
      console.log('   ✗ "Pick from Drive" button not found')
      await page.screenshot({ path: 'test-google-picker-no-button.png', fullPage: true })
      console.log('   Screenshot saved: test-google-picker-no-button.png')
      return
    }

    await pickFromDriveButton.click()
    console.log('   ✓ Clicked button, waiting for OAuth popup...\n')

    // Wait for OAuth popup or error
    await page.waitForTimeout(3000)

    // Check for OAuth popup
    const pages = await browser.pages()
    const oauthPage = pages.find(p => p.url().includes('accounts.google.com'))
    
    if (oauthPage) {
      console.log('7. OAuth popup detected')
      console.log(`   URL: ${oauthPage.url()}\n`)

      // Check for redirect_uri_mismatch error
      const pageContent = await oauthPage.locator('body').textContent()
      
      if (pageContent.includes('redirect_uri_mismatch') || pageContent.includes('invalid request')) {
        console.log('   ✗ ERROR: redirect_uri_mismatch still present!')
        console.log('   Check Google Cloud Console configuration:')
        console.log('   - Authorized JavaScript origins must include:')
        console.log('     * https://bulk-gpt.com')
        console.log('     * https://www.bulk-gpt.com')
        console.log('     * https://bulk-gpt-app.vercel.app')
        console.log('   - Authorized redirect URIs must include:')
        console.log('     * https://bulk-gpt.com')
        console.log('     * https://www.bulk-gpt.com')
        console.log('     * https://bulk-gpt-app.vercel.app')
        
        await oauthPage.screenshot({ path: 'test-google-picker-error.png', fullPage: true })
        console.log('\n   Screenshot saved: test-google-picker-error.png')
      } else if (pageContent.includes('drive.file') || pageContent.includes('consent') || pageContent.includes('Sign in')) {
        console.log('   ✓ OAuth consent screen shown (no redirect_uri_mismatch error)')
        console.log('   ✓ Test PASSED - OAuth flow is working!')
        console.log('\n   ⚠️  Please complete OAuth manually to finish test')
        console.log('   The test will wait for you...')
        
        // Wait for popup to close (user completes OAuth)
        await oauthPage.waitForEvent('close', { timeout: 120000 }).catch(() => {
          console.log('   OAuth popup still open after 2 minutes')
        })
        
        // Check if picker opened
        await page.waitForTimeout(2000)
        const pickerVisible = await page.locator('[role="dialog"], .picker-dialog').count() > 0
        if (pickerVisible) {
          console.log('   ✓ Google Picker opened successfully!')
        }
      } else {
        console.log('   ⚠️  Unexpected OAuth page content')
        console.log(`   Content preview: ${pageContent.substring(0, 200)}...`)
        await oauthPage.screenshot({ path: 'test-google-picker-unexpected.png', fullPage: true })
      }
    } else {
      // Check for error message on main page
      const errorMessage = await page.locator('[role="alert"], .error, [class*="error" i]').first().textContent().catch(() => null)
      if (errorMessage) {
        console.log(`   ✗ Error on page: ${errorMessage}`)
      } else {
        console.log('   ⚠️  No OAuth popup detected - check console for errors')
      }
    }

    await page.screenshot({ path: 'test-google-picker-result.png', fullPage: true })
    console.log('\n   Screenshot saved: test-google-picker-result.png')

  } catch (error) {
    console.error('\n✗ Test failed:', error)
    await page.screenshot({ path: 'test-google-picker-error.png', fullPage: true })
  } finally {
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...')
    await page.waitForTimeout(30000)
    await browser.close()
  }
})()

