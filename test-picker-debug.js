/**
 * Debug script to check Google Picker API status and errors
 */

const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log('=== Debugging Google Picker ===\n')

    await page.goto('https://bulk-gpt.com', { waitUntil: 'networkidle' })

    if (page.url().includes('/auth')) {
      await page.locator('input[type="email"]').fill('test@bulkgpt.local')
      await page.locator('input[type="password"]').fill('Test123456!')
      await page.locator('button[type="submit"]').click()
      await page.waitForNavigation({ waitUntil: 'networkidle' })
    }

    await page.goto('https://bulk-gpt.com/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Switch to Google Sheets tab
    const sheetsTab = page.locator('[role="tab"]:has-text("Google Sheets")').first()
    await sheetsTab.click({ force: true })
    await page.waitForTimeout(3000)

    // Monitor console for errors
    const consoleMessages = []
    page.on('console', msg => {
      const text = msg.text()
      const type = msg.type()
      consoleMessages.push({ type, text })
      if (type === 'error' || text.includes('Picker') || text.includes('Google')) {
        console.log(`[${type.toUpperCase()}] ${text}`)
      }
    })

    // Monitor network requests
    const networkErrors = []
    page.on('response', res => {
      if (!res.ok() && (res.url().includes('google') || res.url().includes('picker'))) {
        networkErrors.push({ url: res.url(), status: res.status() })
        console.log(`❌ Network error: ${res.status()} ${res.url()}`)
      }
    })

    // Check if Google Picker API is available
    const pickerStatus = await page.evaluate(() => {
      return {
        hasGoogle: !!window.google,
        hasPicker: !!window.google?.picker,
        hasOAuth2: !!window.google?.accounts?.oauth2,
        pickerMethods: window.google?.picker ? Object.keys(window.google.picker) : [],
        pickerBuilder: typeof window.google?.picker?.PickerBuilder,
      }
    })
    console.log('\nGoogle Picker API Status:')
    console.log(JSON.stringify(pickerStatus, null, 2))

    // Click "Pick from Google Drive" button
    console.log('\nClicking "Pick from Google Drive"...')
    const pickButton = page.locator('button:has-text("Pick from Google Drive")').first()
    await pickButton.click()

    // Wait for OAuth if needed
    await page.waitForTimeout(3000)
    const pages = await browser.pages()
    const oauthPage = pages.find(p => p.url().includes('accounts.google.com'))
    
    if (oauthPage) {
      console.log('\nOAuth popup detected, waiting for user to complete...')
      // Wait for OAuth to complete (user will do this manually)
      await oauthPage.waitForEvent('close', { timeout: 120000 }).catch(() => {
        console.log('OAuth popup still open after 2 minutes')
      })
      await page.waitForTimeout(2000)
    }

    // After OAuth, check if picker opened
    await page.waitForTimeout(3000)
    
    // Check for picker dialog/iframe
    const pickerVisible = await page.evaluate(() => {
      // Check for common picker selectors
      const iframes = Array.from(document.querySelectorAll('iframe'))
      const pickerIframes = iframes.filter(iframe => 
        iframe.src.includes('google') || 
        iframe.src.includes('picker') ||
        iframe.getAttribute('id')?.includes('picker')
      )
      return {
        totalIframes: iframes.length,
        pickerIframes: pickerIframes.length,
        pickerIframeSrcs: pickerIframes.map(i => i.src),
        visibleDialogs: Array.from(document.querySelectorAll('[role="dialog"], .picker-dialog, [class*="picker"]')).length
      }
    })
    
    console.log('\nPicker Visibility Check:')
    console.log(JSON.stringify(pickerVisible, null, 2))

    // Check console messages
    console.log(`\n\nTotal console messages: ${consoleMessages.length}`)
    const errorMessages = consoleMessages.filter(m => m.type === 'error')
    if (errorMessages.length > 0) {
      console.log('\n❌ Console Errors:')
      errorMessages.forEach(m => console.log(`   ${m.text}`))
    }

    if (networkErrors.length > 0) {
      console.log('\n❌ Network Errors:')
      networkErrors.forEach(e => console.log(`   ${e.status} ${e.url}`))
    }

    await page.screenshot({ path: 'picker-debug.png', fullPage: true })
    console.log('\nScreenshot saved: picker-debug.png')

  } catch (error) {
    console.error('\n✗ Error:', error)
  } finally {
    console.log('\nBrowser will stay open for 60 seconds...')
    await page.waitForTimeout(60000)
    await browser.close()
  }
})()

