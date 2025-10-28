import { test } from '@playwright/test'

test('Check dashboard current state', async ({ page }) => {
  console.log('🔍 Checking dashboard state...')

  // Navigate to dashboard
  await page.goto('http://localhost:3334/dashboard')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  console.log('📸 Taking screenshot...')
  await page.screenshot({ path: '/tmp/dashboard-current-state.png', fullPage: true })

  // Check for batches in table
  const tableRows = page.locator('tbody tr')
  const rowCount = await tableRows.count()
  console.log(`\n📊 Found ${rowCount} batch(es) in dashboard`)

  if (rowCount > 0) {
    // Get first batch details
    const firstRow = tableRows.first()
    const rowText = await firstRow.textContent()
    console.log(`\n--- First Batch ---`)
    console.log(`Full text: ${rowText}`)

    // Check for download button
    const downloadBtn = firstRow.locator('button:has-text("Download")')
    const hasDownload = await downloadBtn.count() > 0
    console.log(`Download button: ${hasDownload ? '✅ Available' : '❌ Not available'}`)

    // Check for token data indicators
    const hasUpArrow = rowText?.includes('↑')
    const hasDownArrow = rowText?.includes('↓')
    const hasGemini = rowText?.includes('gemini')
    const hasPlaceholder = rowText?.includes('—')

    console.log(`\nToken Data Indicators:`)
    console.log(`  ↑ (input): ${hasUpArrow ? '✅' : '❌'}`)
    console.log(`  ↓ (output): ${hasDownArrow ? '✅' : '❌'}`)
    console.log(`  gemini model: ${hasGemini ? '✅' : '❌'}`)
    console.log(`  — placeholder: ${hasPlaceholder ? '✅' : '❌'}`)
  }

  // Check for "Model & Tokens" header
  const tokenHeader = page.locator('th:has-text("Model"), th:has-text("Tokens")')
  const hasTokenHeader = await tokenHeader.count() > 0
  console.log(`\n🏷️  "Model & Tokens" header: ${hasTokenHeader ? '✅ Found' : '❌ Not found'}`)

  console.log('\n✅ Dashboard check complete!')
  console.log('📸 Screenshot saved to: /tmp/dashboard-current-state.png')
})
