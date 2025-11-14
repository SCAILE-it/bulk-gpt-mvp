const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log('=== Debug: Checking Google Sheets Tab ===\n')
    await page.goto('https://bulk-gpt.com', { waitUntil: 'networkidle' })

    if (page.url().includes('/auth')) {
      await page.locator('input[type="email"]').fill('test@bulkgpt.local')
      await page.locator('input[type="password"]').fill('Test123456!')
      await page.locator('button[type="submit"]').click()
      await page.waitForNavigation({ waitUntil: 'networkidle' })
    }

    await page.goto('https://bulk-gpt.com/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Find Google Sheets tab
    const allButtons = await page.locator('button').all()
    console.log(`Found ${allButtons.length} buttons on page\n`)
    
    for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
      const text = await allButtons[i].textContent()
      const ariaLabel = await allButtons[i].getAttribute('aria-label')
      console.log(`Button ${i + 1}: "${text?.trim()}" (aria-label: ${ariaLabel || 'none'})`)
    }

    // Try to find Google Sheets tab
    const sheetsTab = page.locator('[role="tab"]:has-text("Google"), button:has-text("Google")')
    const count = await sheetsTab.count()
    console.log(`\nFound ${count} Google-related tabs/buttons`)
    
    if (count > 0) {
      await sheetsTab.first().click({ force: true })
      await page.waitForTimeout(2000)
      
      // Now check for Pick button
      const allButtonsAfter = await page.locator('button').all()
      console.log(`\nAfter clicking tab, found ${allButtonsAfter.length} buttons`)
      for (let i = 0; i < Math.min(allButtonsAfter.length, 15); i++) {
        const text = await allButtonsAfter[i].textContent()
        if (text && (text.includes('Pick') || text.includes('Drive') || text.includes('Google'))) {
          console.log(`Found relevant button: "${text.trim()}"`)
        }
      }
    }

    await page.screenshot({ path: 'debug-google-picker.png', fullPage: true })
    console.log('\nScreenshot saved: debug-google-picker.png')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await page.waitForTimeout(10000)
    await browser.close()
  }
})()
