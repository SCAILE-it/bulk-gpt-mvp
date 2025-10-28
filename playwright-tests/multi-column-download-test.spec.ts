import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test('Multi-column output and CSV download verification', async ({ page }) => {
  console.log('\n🧪 TESTING MULTI-COLUMN OUTPUT + CSV DOWNLOAD\n')

  let batchId = ''

  // Monitor for batch creation
  page.on('response', async response => {
    if (response.url().includes('/api/process') && response.status() === 202) {
      const data = await response.json()
      batchId = data.batchId
      console.log('✅ Batch created:', batchId)
    }
  })

  // Login
  console.log('🔐 Logging in...')
  await page.goto('https://bulk-gpt-app.vercel.app/auth')
  await page.locator('input[type="email"]').fill('test@bulkgpt.local')
  await page.locator('input[type="password"]').fill('Test123456!')
  await page.locator('button:has-text("Sign in")').click()
  await page.waitForURL(/\/bulk/)
  console.log('✅ Logged in\n')

  // Upload 2-row CSV
  console.log('📁 Uploading 2-row CSV...')
  await page.setInputFiles('input[type="file"]', {
    name: 'multi-test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,company\nAlice,TechCorp\nBob,DataSystems')
  })
  await page.waitForTimeout(2000)
  console.log('✅ CSV uploaded\n')

  // Open Advanced Settings modal
  console.log('⚙️  Opening Advanced Settings...')
  await page.locator('button').filter({ hasText: 'Configure →' }).click()
  await page.waitForTimeout(1000)
  console.log('✅ Advanced Settings modal opened\n')

  // Add multiple output fields (total 3)
  console.log('📝 Adding multiple output fields...')
  const fieldInput = page.locator('input[placeholder="Add field..."]')

  // Add first new field (skills)
  await fieldInput.fill('skills')
  await fieldInput.press('Enter') // Use Enter key to submit
  await page.waitForTimeout(500)

  // Add second new field (experience)
  await fieldInput.fill('experience')
  await fieldInput.press('Enter') // Use Enter key to submit
  await page.waitForTimeout(500)

  console.log('✅ Added 3 output fields: bio (default), skills, experience')

  // Close Advanced Settings modal
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  console.log('✅ Closed Advanced Settings modal\n')

  // Enter prompt
  console.log('✍️  Entering prompt...')
  await page.locator('textarea').first().fill('Write a bio, list skills, and describe experience for {{name}} at {{company}}')
  console.log('✅ Prompt entered\n')

  // Run batch
  console.log('▶️  Running batch...')
  const runButton = page.locator('button').filter({ hasText: /run/i }).first()
  await runButton.click()
  await page.waitForTimeout(3000)

  if (!batchId) {
    throw new Error('❌ No batch ID captured')
  }

  console.log('⏳ Waiting 45s for Modal to process 2 rows × 3 columns...\n')
  await page.waitForTimeout(45000)

  // Navigate to dashboard
  console.log('📊 Navigating to dashboard...')
  await page.goto('https://bulk-gpt-app.vercel.app/dashboard')
  await page.waitForTimeout(3000)
  console.log('✅ On dashboard\n')

  // Find the batch row
  console.log('🔍 Finding batch in table...')
  const batchRow = page.locator(`tr:has-text("${batchId}")`).first()
  await expect(batchRow).toBeVisible({ timeout: 10000 })
  console.log('✅ Found batch row\n')

  // Download CSV
  console.log('📥 Downloading CSV...')
  const downloadPromise = page.waitForEvent('download')
  await batchRow.locator('button').filter({ hasText: /download/i }).click()
  const download = await downloadPromise

  const downloadPath = path.join('/tmp', download.suggestedFilename())
  await download.saveAs(downloadPath)
  console.log(`✅ Downloaded: ${downloadPath}\n`)

  // Read and verify CSV
  const csvContent = fs.readFileSync(downloadPath, 'utf-8')
  console.log('📄 CSV CONTENTS:\n')
  console.log(csvContent)
  console.log('\n')

  // Parse CSV
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  console.log('🔍 VERIFICATION:\n')
  console.log('Headers:', headers)
  console.log('Data rows:', lines.length - 1)
  console.log('')

  // Verify structure
  expect(headers).toContain('name')
  expect(headers).toContain('company')
  expect(headers).toContain('bio')
  expect(headers).toContain('skills')
  expect(headers).toContain('experience')
  console.log('✅ All 5 columns present (2 input + 3 output)\n')

  // Verify row count
  expect(lines.length).toBe(3) // header + 2 rows
  console.log('✅ Correct number of rows\n')

  // Verify data populated
  const bioIdx = headers.indexOf('bio')
  const skillsIdx = headers.indexOf('skills')
  const expIdx = headers.indexOf('experience')

  const row1Fields = lines[1].split(',')
  console.log('Row 1 bio length:', row1Fields[bioIdx]?.length || 0)
  console.log('Row 1 skills length:', row1Fields[skillsIdx]?.length || 0)
  console.log('Row 1 experience length:', row1Fields[expIdx]?.length || 0)
  console.log('')

  expect(row1Fields[bioIdx].length).toBeGreaterThan(10)
  expect(row1Fields[skillsIdx].length).toBeGreaterThan(10)
  expect(row1Fields[expIdx].length).toBeGreaterThan(10)

  console.log('✅ All output fields populated\n')

  console.log('🎉 COMPLETE E2E VERIFICATION SUCCESSFUL!')
  console.log('✅ Multi-column output works')
  console.log('✅ CSV download works')
  console.log('✅ All data persisted correctly\n')
})
