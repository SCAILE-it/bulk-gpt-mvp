/**
 * Test script for Google Sheets export functionality
 * Tests the export with drive.file scope (no verification required)
 */

const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log('=== Testing Google Sheets Export ===\n')

    // Navigate to app
    console.log('1. Navigating to app...')
    await page.goto('https://bulk-gpt-app.vercel.app/', { waitUntil: 'networkidle' })

    // Login if needed
    if (page.url().includes('/auth')) {
      console.log('   Logging in...')
      await page.locator('input[type="email"]').fill('test@bulkgpt.local')
      await page.locator('input[type="password"]').fill('Test123456!')
      await page.locator('button[type="submit"]').click()
      await page.waitForNavigation({ waitUntil: 'networkidle' })
      console.log('   ✓ Logged in\n')
    }

    // Upload CSV if needed
    console.log('2. Checking for CSV data...')
    const hasData = await page.locator('text=/\\d+ rows/').count() > 0
    if (!hasData) {
      console.log('   Uploading CSV...')
      const csvPath = require('path').join(__dirname, 'sample-data.csv')
      await page.locator('input[type="file"]').setInputFiles(csvPath)
      await page.waitForTimeout(3000)
      console.log('   ✓ CSV uploaded\n')
    } else {
      console.log('   ✓ CSV already loaded\n')
    }

    // Run a batch if needed
    console.log('3. Checking for results...')
    const hasResults = await page.locator('text=/Results \\d+\\/\\d+ rows/').count() > 0
    if (!hasResults) {
      console.log('   Running batch...')
      await page.locator('button:has-text("Run All")').click()
      console.log('   Waiting for completion...')
      await page.waitForSelector('text=/Success: \\d+/', { timeout: 60000 })
      await page.waitForTimeout(2000)
      console.log('   ✓ Batch completed\n')
    } else {
      console.log('   ✓ Results already available\n')
    }

    // Test Google Sheets export
    console.log('4. Testing Google Sheets export...')
    const googleSheetsButton = page.locator('button:has-text("Google Sheets")').first()
    
    if (await googleSheetsButton.count() === 0) {
      console.log('   ✗ Google Sheets button not found')
      await page.screenshot({ path: 'test-google-sheets-error.png', fullPage: true })
      return
    }

    console.log('   Clicking Google Sheets export button...')
    await googleSheetsButton.click()
    
    // Wait for OAuth popup or error
    console.log('   Waiting for OAuth flow...')
    await page.waitForTimeout(3000)

    // Check for OAuth popup
    const pages = await browser.pages()
    const oauthPage = pages.find(p => p.url().includes('accounts.google.com'))
    
    if (oauthPage) {
      console.log('   ✓ OAuth popup opened')
      console.log(`   OAuth URL: ${oauthPage.url()}`)
      
      // Check if it's asking for consent
      const consentText = await oauthPage.locator('body').textContent()
      if (consentText.includes('drive.file')) {
        console.log('   ✓ drive.file scope requested (no verification needed)')
      }
      
      // Don't complete OAuth in automated test - user needs to do it manually
      console.log('\n   ⚠️  Please complete OAuth manually in the popup')
      console.log('   The test will wait for you to complete it...')
      
      // Wait for popup to close (user completes OAuth)
      await oauthPage.waitForEvent('close', { timeout: 120000 }).catch(() => {
        console.log('   OAuth popup still open after 2 minutes')
      })
      
      // Check if sheet was created
      await page.waitForTimeout(3000)
      const successMessage = await page.locator('text=/success|created|opened/i').first().textContent().catch(() => null)
      if (successMessage) {
        console.log(`   ✓ Export completed: ${successMessage}`)
      }
    } else {
      // Check for error message
      const errorMessage = await page.locator('[role="alert"], .error, [class*="error" i]').first().textContent().catch(() => null)
      if (errorMessage) {
        console.log(`   ✗ Error: ${errorMessage}`)
      } else {
        console.log('   ⚠️  No OAuth popup detected - check console for errors')
      }
    }

    await page.screenshot({ path: 'test-google-sheets-result.png', fullPage: true })
    console.log('\n   Screenshot saved: test-google-sheets-result.png')

  } catch (error) {
    console.error('\n✗ Test failed:', error)
    await page.screenshot({ path: 'test-google-sheets-error.png', fullPage: true })
  } finally {
    // Keep browser open for manual testing
    console.log('\nBrowser will stay open for 30 seconds for manual testing...')
    await page.waitForTimeout(30000)
    await browser.close()
  }
})()

