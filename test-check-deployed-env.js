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

    // Check what environment variables are available in the browser
    const envCheck = await page.evaluate(() => {
      return {
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'NOT_SET',
        NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || 'NOT_SET',
        // Also check window for any Google config
        windowGoogle: typeof window !== 'undefined' ? !!window.google : false
      }
    })

    console.log('Environment variables check:')
    console.log(JSON.stringify(envCheck, null, 2))

    // Check for error messages
    const errorText = await page.locator('body').textContent()
    if (errorText?.includes('not configured') || errorText?.includes('Client ID')) {
      console.log('\n⚠️  Found configuration error in page text')
      const errorMatch = errorText.match(/Google.*?not.*?configured|Client ID.*?not.*?found/i)
      if (errorMatch) {
        console.log(`   Error: ${errorMatch[0]}`)
      }
    }

    // Check console logs
    const consoleLogs = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Google') || text.includes('Client ID')) {
        consoleLogs.push(`[${msg.type()}] ${text}`)
      }
    })

    await page.waitForTimeout(2000)
    
    if (consoleLogs.length > 0) {
      console.log('\nConsole logs related to Google:')
      consoleLogs.forEach(log => console.log(`   ${log}`))
    }

    await page.screenshot({ path: 'check-deployed-env.png', fullPage: true })
    console.log('\nScreenshot saved: check-deployed-env.png')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await page.waitForTimeout(10000)
    await browser.close()
  }
})()
