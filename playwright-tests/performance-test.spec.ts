import { test, expect } from '@playwright/test'

test.describe('Context Files Performance Test', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/auth')
    await page.fill('input[type="email"]', 'test@bulkgpt.local')
    await page.fill('input[type="password"]', 'Test123456!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/context', { timeout: 10000 })
  })

  test('should measure initial load performance', async ({ page }) => {
    console.log('\n=== Testing Initial Load Performance ===\n')
    
    // Clear console logs
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('[PERF]')) {
        consoleLogs.push(text)
      }
    })

    // Measure navigation time
    const startTime = Date.now()
    await page.goto('http://localhost:3000/context', { waitUntil: 'networkidle' })
    const navigationTime = Date.now() - startTime

    // Wait for files to load (check for loading spinner to disappear or files to appear)
    await page.waitForSelector('text=Loading files...', { state: 'hidden', timeout: 10000 }).catch(() => {})
    // Or wait for files list or empty state
    await page.waitForSelector('text=No files uploaded yet, text=Uploaded Files', { timeout: 10000 }).catch(() => {})

    const totalTime = Date.now() - startTime

    console.log(`Navigation time: ${navigationTime}ms`)
    console.log(`Total time to interactive: ${totalTime}ms`)
    console.log('\nConsole Performance Logs:')
    consoleLogs.forEach(log => console.log(log))

    // Check if loading spinner is gone
    const loadingSpinner = await page.locator('text=Loading files...').count()
    expect(loadingSpinner).toBe(0)

    // Log network timing
    const response = await page.waitForResponse('**/api/context-files', { timeout: 10000 })
    const timing = response.timing()
    console.log('\nNetwork Timing:')
    console.log(`  DNS: ${timing.dns}ms`)
    console.log(`  Connect: ${timing.connect}ms`)
    console.log(`  SSL: ${timing.ssl}ms`)
    console.log(`  Send: ${timing.send}ms`)
    console.log(`  Wait: ${timing.wait}ms`)
    console.log(`  Receive: ${timing.receive}ms`)
    console.log(`  Total: ${timing.dns + timing.connect + timing.ssl + timing.send + timing.wait + timing.receive}ms`)
  })

  test('should show cached data instantly on second load', async ({ page }) => {
    console.log('\n=== Testing Cached Load Performance ===\n')
    
    // First load
    await page.goto('http://localhost:3000/context', { waitUntil: 'networkidle' })
    await page.waitForSelector('text=Loading files...', { state: 'hidden', timeout: 10000 }).catch(() => {})
    
    // Navigate away
    await page.goto('http://localhost:3000/bulk', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Second load - should use cache
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('[PERF]')) {
        consoleLogs.push(text)
      }
    })

    const startTime = Date.now()
    await page.goto('http://localhost:3000/context', { waitUntil: 'domcontentloaded' })
    const navigationTime = Date.now() - startTime

    // Check if files appear immediately (no loading spinner)
    const hasLoadingSpinner = await page.locator('text=Loading files...').count()
    const hasFilesOrEmpty = await Promise.race([
      page.locator('text=Uploaded Files').waitFor({ timeout: 1000 }).then(() => true),
      page.locator('text=No files uploaded yet').waitFor({ timeout: 1000 }).then(() => true),
    ]).catch(() => false)

    const totalTime = Date.now() - startTime

    console.log(`Second load navigation time: ${navigationTime}ms`)
    console.log(`Total time to show content: ${totalTime}ms`)
    console.log(`Has loading spinner: ${hasLoadingSpinner > 0}`)
    console.log(`Content visible immediately: ${hasFilesOrEmpty}`)
    console.log('\nConsole Performance Logs:')
    consoleLogs.forEach(log => console.log(log))

    // Should not show loading spinner on cached load
    expect(hasLoadingSpinner).toBe(0)
    // Content should appear quickly
    expect(totalTime).toBeLessThan(2000) // Should be much faster than first load
  })

  test('should measure API response time', async ({ page }) => {
    console.log('\n=== Testing API Response Time ===\n')
    
    const apiTimings: Array<{ url: string, timing: any }> = []
    
    page.on('response', (response) => {
      if (response.url().includes('/api/context-files')) {
        const timing = response.timing()
        apiTimings.push({
          url: response.url(),
          timing: {
            dns: timing.dns,
            connect: timing.connect,
            ssl: timing.ssl,
            send: timing.send,
            wait: timing.wait,
            receive: timing.receive,
            total: timing.dns + timing.connect + timing.ssl + timing.send + timing.wait + timing.receive
          }
        })
      }
    })

    await page.goto('http://localhost:3000/context', { waitUntil: 'networkidle' })
    await page.waitForSelector('text=Loading files...', { state: 'hidden', timeout: 10000 }).catch(() => {})

    console.log('API Response Timings:')
    apiTimings.forEach(({ url, timing }) => {
      console.log(`  ${url}:`)
      console.log(`    DNS: ${timing.dns}ms`)
      console.log(`    Connect: ${timing.connect}ms`)
      console.log(`    SSL: ${timing.ssl}ms`)
      console.log(`    Send: ${timing.send}ms`)
      console.log(`    Wait (server): ${timing.wait}ms`)
      console.log(`    Receive: ${timing.receive}ms`)
      console.log(`    Total: ${timing.total}ms`)
    })
  })

  test('should deduplicate multiple requests', async ({ page }) => {
    console.log('\n=== Testing Request Deduplication ===\n')
    
    const requests: string[] = []
    
    page.on('request', (request) => {
      if (request.url().includes('/api/context-files') && request.method() === 'GET') {
        requests.push(request.url())
      }
    })

    // Navigate to context page
    await page.goto('http://localhost:3000/context', { waitUntil: 'networkidle' })
    
    // Wait a bit and navigate again quickly (should use cache)
    await page.waitForTimeout(500)
    await page.reload({ waitUntil: 'networkidle' })

    console.log(`Total GET requests to /api/context-files: ${requests.length}`)
    console.log('Request URLs:', requests)

    // With SWR deduplication, should have fewer requests
    // First load + potential revalidation, but deduplication should prevent duplicates
    expect(requests.length).toBeLessThanOrEqual(2) // Initial + maybe one revalidation
  })
})

