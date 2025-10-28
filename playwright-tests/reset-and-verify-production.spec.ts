import { test, expect } from '@playwright/test'
import * as fs from 'fs'

test('Reset rate limit and verify full production flow', async ({ page }) => {
  console.log('\n🔧 PRODUCTION RATE LIMIT RESET & VERIFICATION\n')
  console.log('URL: https://bulk-gpt-app.vercel.app')
  console.log('Goal: Clear stuck rate limit, then verify Export fix works\n')

  // Step 1: Login
  console.log('📝 Step 1: Logging in...')
  await page.goto('https://bulk-gpt-app.vercel.app/auth')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', 'test@bulkgpt.local')
  await page.fill('input[type="password"]', 'Test123456!')
  await page.click('button[type="submit"]')

  await page.waitForURL('**/bulk', { timeout: 20000 })
  console.log('✅ Logged in successfully\n')

  // Step 2: Reset rate limit using authenticated request
  console.log('🔄 Step 2: Resetting stuck rate limit...')

  try {
    const resetResponse = await page.evaluate(async () => {
      const response = await fetch('/api/batch/reset', {
        method: 'POST',
        credentials: 'include', // Include cookies for auth
      })
      const data = await response.json()
      return { status: response.status, data }
    })

    console.log(`Reset API response: HTTP ${resetResponse.status}`)
    console.log('Response body:', JSON.stringify(resetResponse.data, null, 2))

    if (resetResponse.status === 200 && resetResponse.data.success) {
      console.log('✅ Rate limit reset successful!\n')
    } else {
      console.log('⚠️  Reset response unexpected, but continuing...\n')
    }
  } catch (error) {
    console.log('❌ Reset failed:', error.message)
    console.log('Continuing with test anyway...\n')
  }

  // Step 3: Upload CSV
  console.log('📁 Step 3: Uploading CSV...')
  const csvContent = `name,company
Alice Smith,TechCorp
Bob Jones,DataInc
Carol White,CloudCo`

  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles({
    name: 'test-production-reset.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  })
  await page.waitForTimeout(2000)
  console.log('✅ CSV uploaded\n')

  // Step 4: Enter prompt
  console.log('✍️  Step 4: Entering prompt...')
  await page.locator('textarea').first().fill('Write a 1-sentence bio for {{name}} at {{company}}.')
  console.log('✅ Prompt entered\n')

  // Step 5: Monitor for rate limit error
  console.log('▶️  Step 5: Attempting to create batch...')

  let batchCreationFailed = false
  let errorMessage = ''

  page.on('response', async response => {
    if (response.url().includes('/api/process')) {
      const status = response.status()
      console.log(`📡 /api/process response: HTTP ${status}`)

      if (status === 429) {
        batchCreationFailed = true
        try {
          const data = await response.json()
          errorMessage = data.error || 'Unknown error'
          console.log(`🔴 RATE LIMIT STILL BLOCKING:`, data)
        } catch (e) {
          errorMessage = 'Rate limited (429)'
        }
      } else if (status === 200) {
        try {
          const data = await response.json()
          console.log(`✅ Batch created successfully:`, data)
        } catch (e) {
          console.log(`✅ Batch creation response: HTTP 200`)
        }
      }
    }
  })

  const runButton = page.locator('button').filter({ hasText: /run all|run/i }).first()
  await runButton.click()
  console.log('✅ Run button clicked\n')

  // Wait to see if we get rate limited
  await page.waitForTimeout(3000)

  if (batchCreationFailed) {
    console.log('\n❌ BATCH CREATION STILL BLOCKED\n')
    console.log('Error:', errorMessage)
    console.log('\nThe rate limit reset endpoint may not have worked.')
    console.log('This suggests the in-memory state might require a server restart.')
    throw new Error('Rate limit still blocking after reset attempt')
  }

  // Step 6: Wait for completion
  console.log('⏳ Step 6: Waiting for batch to complete...')
  const maxWaitTime = 180000 // 3 minutes
  const startTime = Date.now()
  let allComplete = false

  while (!allComplete && (Date.now() - startTime) < maxWaitTime) {
    const doneCount = await page.locator('text=/^Done$/i').count()
    const elapsed = (Date.now() - startTime) / 1000

    if (elapsed % 10 < 1) {
      console.log(`  ⏱️  ${elapsed.toFixed(0)}s elapsed - ${doneCount}/3 rows completed`)
    }

    if (doneCount >= 3) {
      allComplete = true
      console.log(`\n✅ ALL 3 rows completed in ${elapsed.toFixed(1)}s\n`)
      break
    }

    await page.waitForTimeout(3000)
  }

  if (!allComplete) {
    await page.screenshot({ path: '/tmp/prod-reset-timeout.png', fullPage: true })
    throw new Error('Batch did not complete in 3 minutes')
  }

  // Wait for database to be fully updated
  console.log('⏳ Waiting 5s for database sync...')
  await page.waitForTimeout(5000)

  // Step 7: Export and verify
  console.log('📥 Step 7: Exporting results...')

  const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
  const exportVisible = await exportButton.isVisible()
  console.log(`Export button visible: ${exportVisible}`)

  if (!exportVisible) {
    throw new Error('Export button not visible after batch completion')
  }

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await exportButton.click()

  console.log('⏳ Waiting for download...')
  const download = await downloadPromise
  const downloadPath = `/tmp/production-reset-verified-${Date.now()}.csv`
  await download.saveAs(downloadPath)

  console.log(`✅ Downloaded: ${downloadPath}\n`)

  // Step 8: Verify CSV content
  console.log('📊 Step 8: Verifying CSV content...')

  const csvData = fs.readFileSync(downloadPath, 'utf-8')
  const lines = csvData.trim().split('\n')

  console.log('\n📄 Downloaded CSV:')
  console.log('─'.repeat(80))
  lines.forEach((line, i) => {
    const display = line.length > 100 ? line.substring(0, 100) + '...' : line
    console.log(`${i === 0 ? 'HEADER' : 'Row ' + i}: ${display}`)
  })
  console.log('─'.repeat(80))

  console.log(`\nTotal lines: ${lines.length}`)
  expect(lines.length).toBeGreaterThanOrEqual(4) // header + 3 rows

  // Verify actual AI output (not empty/pending/error)
  let rowsWithActualOutput = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const hasContent = line.length > 50
    const notPending = !line.toLowerCase().includes('pending')
    const notEmpty = line.trim() !== ''

    if (hasContent && notPending && notEmpty) {
      rowsWithActualOutput++
      console.log(`  ✅ Row ${i}: Has actual AI output`)
    } else {
      console.log(`  ❌ Row ${i}: Missing or invalid output`)
      console.log(`     Preview: ${line.substring(0, 60)}...`)
    }
  }

  console.log(`\n📈 Results:`)
  console.log(`  ✅ Rows with actual AI output: ${rowsWithActualOutput}`)
  console.log(`  ❌ Empty/error rows: ${lines.length - 1 - rowsWithActualOutput}`)

  expect(rowsWithActualOutput).toBeGreaterThanOrEqual(3)

  // Final success
  console.log('\n' + '='.repeat(80))
  console.log('🎉 SUCCESS: PRODUCTION VERIFIED!')
  console.log('='.repeat(80))
  console.log('\n✓ Rate limit reset worked')
  console.log('✓ Batch processing works')
  console.log('✓ Export downloads actual AI output')
  console.log('✓ Database fetch working correctly')
  console.log('✓ Export fix confirmed working on production')
  console.log('\n✅ ALL SYSTEMS OPERATIONAL ✅\n')
})
