const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    await page.goto('https://bulk-gpt.com', { waitUntil: 'networkidle' })

    if (page.url().includes('/auth')) {
      await page.locator('input[type="email"]').fill('test@bulkgpt.local')
      await page.locator('input[type="password"]').fill('Test123456!')
      await page.locator('button[type="submit"]').click()
      await page.waitForNavigation({ waitUntil: 'networkidle' })
    }

    await page.goto('https://bulk-gpt.com/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)

    // Click Google Sheets tab
    const sheetsTab = page.locator('[role="tab"]:has-text("Google Sheets")').first()
    await sheetsTab.click({ force: true })
    await page.waitForTimeout(3000)

    // Check console for errors
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Check if Google scripts are loaded
    const scriptsLoaded = await page.evaluate(() => {
      return {
        hasGoogle: !!window.google,
        hasPicker: !!window.google?.picker,
        hasOAuth2: !!window.google?.accounts?.oauth2,
        scriptsInDOM: Array.from(document.querySelectorAll('script[src*="google"]')).map(s => s.src)
      }
    })

    console.log('Google Scripts Status:')
    console.log(JSON.stringify(scriptsLoaded, null, 2))
    console.log('\nConsole Errors:', consoleErrors.length > 0 ? consoleErrors : 'None')

    // Check for any error messages on page
    const errorElements = await page.locator('[role="alert"], .error, [class*="error" i]').all()
    console.log(`\nFound ${errorElements.length} error elements`)
    for (const el of errorElements) {
      const text = await el.textContent()
      if (text && text.trim()) {
        console.log(`  Error: ${text.trim()}`)
      }
    }

    // Check all buttons in Google Sheets tab content
    const tabContent = page.locator('[role="tabpanel"], [data-state="active"]').last()
    const buttonsInTab = await tabContent.locator('button').all()
    console.log(`\nFound ${buttonsInTab.length} buttons in Google Sheets tab`)
    for (const btn of buttonsInTab) {
      const text = await btn.textContent()
      const disabled = await btn.isDisabled()
      const visible = await btn.isVisible()
      if (text && text.trim()) {
        console.log(`  Button: "${text.trim()}" (disabled: ${disabled}, visible: ${visible})`)
      }
    }

    await page.screenshot({ path: 'debug-google-scripts.png', fullPage: true })
    console.log('\nScreenshot saved: debug-google-scripts.png')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await page.waitForTimeout(15000)
    await browser.close()
  }
})()
