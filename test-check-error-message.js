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
    await page.waitForTimeout(2000)

    // Click Google Sheets tab
    const sheetsTab = page.locator('[role="tab"]:has-text("Google Sheets")').first()
    await sheetsTab.click({ force: true })
    await page.waitForTimeout(3000)

    // Check for error message
    const errorElements = await page.locator('[role="alert"], .error, [class*="error" i], [class*="alert" i]').all()
    console.log(`Found ${errorElements.length} error/alert elements`)
    
    for (const el of errorElements) {
      const text = await el.textContent()
      const visible = await el.isVisible()
      if (text && text.trim() && visible) {
        console.log(`\nError message: "${text.trim()}"`)
      }
    }

    // Check all text on page for Google-related errors
    const pageText = await page.locator('body').textContent()
    if (pageText) {
      const googleErrorMatch = pageText.match(/Google.*?not.*?configured|Client ID.*?not.*?found|Google Sheets integration/i)
      if (googleErrorMatch) {
        console.log(`\n⚠️  Found Google error in page: "${googleErrorMatch[0]}"`)
      }
    }

    // Check console for errors
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Google') || msg.text().includes('Client ID')) {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`)
      }
    })

    await page.waitForTimeout(3000)
    
    if (consoleErrors.length > 0) {
      console.log('\nConsole errors/logs:')
      consoleErrors.forEach(err => console.log(`   ${err}`))
    }

    // Check if button exists but is hidden
    const allButtons = await page.locator('button').all()
    console.log(`\nTotal buttons on page: ${allButtons.length}`)
    for (const btn of allButtons) {
      const text = await btn.textContent()
      const visible = await btn.isVisible()
      const disabled = await btn.isDisabled()
      if (text && (text.includes('Pick') || text.includes('Drive') || text.includes('Google'))) {
        console.log(`   Button: "${text.trim()}" (visible: ${visible}, disabled: ${disabled})`)
      }
    }

    await page.screenshot({ path: 'check-error-message.png', fullPage: true })
    console.log('\nScreenshot saved: check-error-message.png')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await page.waitForTimeout(10000)
    await browser.close()
  }
})()
