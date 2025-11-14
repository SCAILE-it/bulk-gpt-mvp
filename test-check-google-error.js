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

    // Get all text content to see what's actually rendered
    const pageText = await page.locator('body').textContent()
    console.log('Page content (first 1000 chars):')
    console.log(pageText?.substring(0, 1000))
    
    // Check for specific error messages
    const errorText = await page.locator('body').textContent()
    if (errorText?.includes('not configured') || errorText?.includes('Client ID')) {
      console.log('\n⚠️  Found configuration error!')
    }
    if (errorText?.includes('not loaded')) {
      console.log('\n⚠️  Found script loading error!')
    }

    // Check network requests for Google scripts
    const requests = []
    page.on('request', req => {
      if (req.url().includes('google.com') || req.url().includes('googleapis.com')) {
        requests.push({ url: req.url(), method: req.method() })
      }
    })
    
    page.on('response', res => {
      if (res.url().includes('google.com') || res.url().includes('googleapis.com')) {
        if (!res.ok()) {
          console.log(`\n❌ Failed request: ${res.url()} - ${res.status()}`)
        }
      }
    })

    await page.waitForTimeout(5000)
    
    console.log(`\n\nGoogle-related network requests: ${requests.length}`)
    requests.forEach(req => console.log(`  ${req.method} ${req.url}`))

    await page.screenshot({ path: 'debug-google-error-full.png', fullPage: true })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await page.waitForTimeout(10000)
    await browser.close()
  }
})()
