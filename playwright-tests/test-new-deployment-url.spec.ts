import { test, expect } from '@playwright/test'

test('Verify batch creation with new Modal URL', async ({ page }) => {
  console.log('\n🔧 TESTING NEW DEPLOYMENT\n')
  console.log('URL: https://bulk-gpt-bbddxrjhq-federico-de-pontes-projects.vercel.app')

  // Login
  console.log('📝 Logging in...')
  await page.goto('https://bulk-gpt-bbddxrjhq-federico-de-pontes-projects.vercel.app/auth')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  await page.waitForURL('**/bulk', { timeout: 20000 })
  console.log('✅ Logged in\n')

  // Upload CSV
  console.log('📁 Uploading CSV...')
  const csvContent = `name,company
Alice Smith,TechCorp`

  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  })
  await page.waitForTimeout(2000)
  console.log('✅ CSV uploaded\n')

  // Enter prompt
  console.log('✍️  Entering prompt...')
  await page.locator('textarea').first().fill('Write a 1-sentence bio for {{name}} at {{company}}.')
  console.log('✅ Prompt entered\n')

  // Monitor API response
  console.log('▶️  Creating batch...\n')

  let apiResponse = null
  page.on('response', async response => {
    if (response.url().includes('/api/process')) {
      const status = response.status()
      console.log(`📡 /api/process: HTTP ${status}`)

      try {
        const data = await response.json()
        apiResponse = { status, data }
        console.log('Response:', JSON.stringify(data, null, 2))
      } catch (e) {
        console.log('Could not parse response')
      }
    }
  })

  const runButton = page.locator('button').filter({ hasText: /run all|run/i }).first()
  await runButton.click()
  console.log('✅ Run button clicked\n')

  // Wait for API response
  await page.waitForTimeout(5000)

  if (apiResponse) {
    console.log(`\n📊 RESULT: HTTP ${apiResponse.status}`)

    if (apiResponse.status === 202) {
      console.log('✅ Batch created successfully!')
      console.log(`Batch ID: ${apiResponse.data.batchId}`)
      expect(apiResponse.data.batchId).toBeTruthy()
    } else {
      console.log(`❌ Unexpected status: ${apiResponse.status}`)
      throw new Error(`Expected 202, got ${apiResponse.status}`)
    }
  } else {
    throw new Error('No API response received')
  }
})
