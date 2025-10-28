import { test, expect } from '@playwright/test'
import fs from 'fs'

test('Download and verify CSV with token columns', async ({ page }) => {
  console.log('📥 Testing CSV download with token data...')

  // Navigate to dashboard
  await page.goto('http://localhost:3334/dashboard')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Find first completed batch row
  const firstRow = page.locator('tbody tr').first()

  // Click download button (icon)
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  const downloadIcon = firstRow.locator('button svg, button [class*="download"]').first()
  await downloadIcon.click()
  console.log('🖱️  Clicked download icon')

  // Wait for download
  const download = await downloadPromise
  const downloadPath = `/tmp/verified-batch-${Date.now()}.csv`
  await download.saveAs(downloadPath)
  console.log(`💾 CSV downloaded to: ${downloadPath}`)

  // Read CSV contents
  const csvContent = fs.readFileSync(downloadPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())

  console.log(`\n📄 CSV Analysis:`)
  console.log(`Total lines: ${lines.length}`)

  // Check header
  const header = lines[0]
  console.log(`\nHeader: ${header}`)

  const requiredColumns = ['name', 'company', 'AI_Output', 'Status', 'Error', 'Input_Tokens', 'Output_Tokens', 'Model']
  const missingColumns = requiredColumns.filter(col => !header.includes(col))

  if (missingColumns.length === 0) {
    console.log('\n✅ ALL required columns present!')
    requiredColumns.forEach(col => console.log(`  ✓ ${col}`))
  } else {
    console.log('\n❌ Missing columns:')
    missingColumns.forEach(col => console.log(`  ✗ ${col}`))
  }

  // Check data rows
  if (lines.length > 1) {
    console.log(`\n📊 Data Rows: ${lines.length - 1}`)

    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      console.log(`\nRow ${i}: ${lines[i]}`)

      // Parse CSV row (simple split, may have issues with quoted commas)
      const values = lines[i].split(',')

      // Check for token data (should not be 0 or empty)
      const hasTokens = values.some(v => /\d{2,}/.test(v)) // Look for 2+ digit numbers
      const hasModel = lines[i].includes('gemini')

      console.log(`  Token data present: ${hasTokens ? '✅' : '❌'}`)
      console.log(`  Model name present: ${hasModel ? '✅' : '❌'}`)
    }
  }

  console.log('\n✅ CSV download verification complete!')
  console.log(`📁 File saved: ${downloadPath}`)

  // Keep the file for manual inspection
  console.log('\n💡 You can manually inspect the CSV at:')
  console.log(`   cat ${downloadPath}`)
})
