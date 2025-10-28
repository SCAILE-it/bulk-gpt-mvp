import { test } from '@playwright/test'

test('Diagnose why batches dont process on production', async ({ page }) => {
  console.log('\n🔍 PRODUCTION BATCH FAILURE DIAGNOSIS\n')

  // Capture ALL console messages
  const consoleLogs: Array<{ type: string; text: string }> = []
  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text() }
    consoleLogs.push(entry)
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`🔴 ${msg.type().toUpperCase()}: ${msg.text()}`)
    }
  })

  // Capture network failures
  page.on('requestfailed', request => {
    console.log(`❌ REQUEST FAILED: ${request.url()}`)
    console.log(`   Method: ${request.method()}`)
    console.log(`   Failure: ${request.failure()?.errorText}`)
  })

  // Login
  console.log('📝 Logging in...')
  await page.goto('https://bulk-gpt-app.vercel.app/auth')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  await page.waitForURL('**/bulk', { timeout: 20000 })
  console.log('✅ Logged in\n')

  // Upload CSV
  console.log('📁 Uploading CSV...')
  const csvContent = `name,company
Alice Smith,TechCorp
Bob Jones,DataInc
Carol White,CloudCo`

  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles({
    name: 'test-diagnose.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  })
  await page.waitForTimeout(2000)
  console.log('✅ CSV uploaded\n')

  // Enter prompt
  console.log('✍️  Entering prompt...')
  await page.locator('textarea').first().fill('Write a bio for {{name}} at {{company}}.')
  await page.waitForTimeout(1000)
  console.log('✅ Prompt entered\n')

  // Capture network request to /api/process
  let processApiCalled = false
  let processApiResponse: any = null
  page.on('response', async response => {
    if (response.url().includes('/api/process')) {
      processApiCalled = true
      console.log(`\n📡 /api/process called: ${response.status()}`)
      try {
        processApiResponse = await response.json()
        console.log('📦 Response:', JSON.stringify(processApiResponse, null, 2))
      } catch (e) {
        console.log('⚠️  Could not parse response as JSON')
      }
    }
  })

  // Click Run button
  console.log('▶️  Clicking Run All button...')
  const runButton = page.locator('button').filter({ hasText: /run all/i }).first()
  await runButton.click()
  console.log('✅ Button clicked\n')

  // Wait 10 seconds to capture any async errors
  await page.waitForTimeout(10000)

  // Print diagnosis
  console.log('\n' + '='.repeat(80))
  console.log('📊 DIAGNOSIS RESULTS')
  console.log('='.repeat(80))

  console.log(`\n/api/process called: ${processApiCalled ? '✅ YES' : '❌ NO'}`)
  if (processApiResponse) {
    console.log(`Batch ID: ${processApiResponse.batchId || 'N/A'}`)
    console.log(`Status: ${processApiResponse.status || 'N/A'}`)
    console.log(`Error: ${processApiResponse.error || 'None'}`)
  }

  const errors = consoleLogs.filter(log => log.type === 'error')
  const warnings = consoleLogs.filter(log => log.type === 'warning')

  console.log(`\nConsole Errors: ${errors.length}`)
  errors.forEach(err => console.log(`  - ${err.text}`))

  console.log(`\nConsole Warnings: ${warnings.length}`)
  warnings.forEach(warn => console.log(`  - ${warn.text}`))

  // Check current batch status
  console.log('\n📋 Checking batch rows...')
  const waitingRows = await page.locator('text=/Waiting in queue/i').count()
  const processingRows = await page.locator('text=/Processing/i').count()
  const doneRows = await page.locator('text=/^Done$/i').count()

  console.log(`  Waiting: ${waitingRows}`)
  console.log(`  Processing: ${processingRows}`)
  console.log(`  Done: ${doneRows}`)

  console.log('\n' + '='.repeat(80) + '\n')
})
