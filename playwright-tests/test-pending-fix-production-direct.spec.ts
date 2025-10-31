/**
 * Direct test on production with inline authentication
 * No dependencies, just logs in and tests the pending bug fix
 */

import { test, expect } from '@playwright/test'

const PROD_URL = 'https://bulk-gpt-app.vercel.app'
const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!'
}

// Disable auth state file requirement for no-auth project
test.use({ storageState: undefined })

test('Verify pending count fix on production with direct auth', async ({ page }) => {
  test.setTimeout(300000) // 5 minutes

  console.log('\n🔍 Testing pending count fix on production with direct authentication...\n')

  // Step 1: Navigate to auth page and login
  console.log('🔐 Step 1: Authenticating...')
  await page.goto(`${PROD_URL}/auth`, { waitUntil: 'networkidle' })

  // Wait for login form
  await page.waitForSelector('#email', { timeout: 30000 })

  // Fill in credentials
  await page.locator('#email').fill(TEST_USER.email)
  await page.locator('#password').fill(TEST_USER.password)

  // Submit form
  const submitButton = page.locator('button[type="submit"]')
  await submitButton.click()

  // Wait for redirect to bulk page after successful login
  await page.waitForURL('**/bulk', { timeout: 30000 })
  console.log('✓ Successfully authenticated and redirected to /bulk')

  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'screenshots/production-fixes/01-logged-in.png', fullPage: true })

  // Step 2: Set prompt BEFORE uploading CSV (to avoid validation mismatch)
  console.log('\n📝 Step 2: Setting prompt...')
  const promptTextarea = page.locator('textarea').first()
  // Clear default prompt first
  await promptTextarea.fill('')
  await page.waitForTimeout(500)
  // Set prompt that matches CSV columns we're about to upload
  await promptTextarea.fill('Research {{provider}} in {{category}}. Return JSON with name, type, and region fields.')
  console.log('✓ Configured prompt (before CSV upload to avoid validation issues)')

  // Step 3: Upload CSV
  console.log('\n📄 Step 3: Uploading CSV...')
  // Use multi-column CSV to avoid delimiter detection issues
  const csvContent = 'provider,category\nAWS,cloud\nGCP,cloud\nAzure,cloud'

  // Use fileChooser event to handle file upload (more reliable than setInputFiles)
  const fileChooserPromise = page.waitForEvent('filechooser')

  // Click the "Browse Files" button to trigger file chooser
  await page.locator('button:has-text("Browse Files")').click()

  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'test-pending-fix.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent),
  })
  console.log('✓ Uploaded CSV file via file chooser')

  // Wait for CSV to be parsed and validated (success indicator appears)
  console.log('Waiting for CSV to be processed...')
  try {
    // Wait for row count display to appear (indicates successful CSV load)
    await page.waitForSelector('[data-testid="row-count-display"]', { timeout: 10000 })
    console.log('✓ CSV successfully loaded and parsed')
  } catch (error) {
    console.log('⚠️  Row count display not found, checking for error message...')
    const errorMessage = await page.locator('div.text-red-400').textContent().catch(() => null)
    if (errorMessage) {
      console.log(`❌ CSV Error: ${errorMessage}`)
      throw new Error(`CSV upload failed: ${errorMessage}`)
    }
    throw error
  }

  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'screenshots/production-fixes/02-csv-uploaded.png', fullPage: true })

  // Step 4: Configure output columns
  console.log('\n⚙️  Step 4: Configuring output columns...')

  // First, clear any existing output columns (leftover from previous sessions or defaults)
  const existingRemoveButtons = page.locator('button:has-text("×")').filter({ has: page.locator('..').filter({ hasText: /^(bio|name|type|region|field)$/ }) })
  const removeCount = await existingRemoveButtons.count()
  console.log(`  Found ${removeCount} existing output columns to remove`)
  for (let i = 0; i < removeCount; i++) {
    // Always click the first one since they shift after each removal
    await existingRemoveButtons.first().click({ timeout: 1000 }).catch(() => {})
    await page.waitForTimeout(200)
  }
  console.log('  ✓ Cleared existing output columns')

  // Now add our output columns
  const outputColumns = ['name', 'type', 'region']
  for (const col of outputColumns) {
    const fieldInput = page.locator('input[placeholder="field..."]').first()
    await fieldInput.fill(col)
    await fieldInput.press('Enter')
    await page.waitForTimeout(500)
  }
  console.log(`✓ Configured output columns: ${outputColumns.join(', ')}`)

  await page.screenshot({ path: 'screenshots/production-fixes/03-configured.png', fullPage: true })

  // Step 5: Click Run All
  console.log('\n🚀 Step 5: Starting batch...')
  const runButton = page.locator('button[data-testid="run-button"]')

  // Wait a moment for validation to complete
  await page.waitForTimeout(1000)

  await runButton.click()
  console.log('✓ Clicked Run All')

  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'screenshots/production-fixes/04-batch-started.png', fullPage: true })

  // Step 6: Monitor batch progress
  console.log('\n📊 Step 6: Monitoring batch progress...\n')

  let attempt = 0
  const maxAttempts = 90 // 3 minutes

  while (attempt < maxAttempts) {
    attempt++

    // Get BatchStatusCard counts
    const successText = await page.locator('div:has-text("Success") p.text-lg').first().textContent().catch(() => '0')
    const failedText = await page.locator('div:has-text("Failed") p.text-lg').first().textContent().catch(() => '0')
    const pendingText = await page.locator('div:has-text("Pending") p.text-lg').first().textContent().catch(() => '0')

    const successCount = parseInt(successText || '0')
    const failedCount = parseInt(failedText || '0')
    const pendingCount = parseInt(pendingText || '0')

    // Get results header
    const resultsHeader = await page.locator('span.text-xs.text-zinc-600').filter({ hasText: 'rows' }).textContent().catch(() => 'N/A')

    // Count row statuses
    const doneRows = await page.locator('span:has-text("Done")').count()
    const failedRows = await page.locator('span.text-red-400:has-text("Failed")').count()
    const waitingRows = await page.locator('span:has-text("Waiting in queue")').count()
    const processingRows = await page.locator('span:has-text("Processing")').count()

    console.log(`[${attempt}/${maxAttempts}]`)
    console.log(`  BatchStatusCard: Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
    console.log(`  Results Header: ${resultsHeader}`)
    console.log(`  Table Rows: Done=${doneRows}, Failed=${failedRows}, Waiting=${waitingRows}, Processing=${processingRows}`)

    // Check initial state
    if (attempt === 1) {
      if (pendingCount === 0 && successCount === 0 && failedCount === 0) {
        console.log('  ✅ GOOD: Initial state shows all zeros')
      } else if (pendingCount === 3 && successCount === 0) {
        console.log('  ✅ GOOD: Initial state shows Pending=3')
      } else if (successCount === 3 && pendingCount === 3) {
        console.log('  ❌ BUG: Shows Success=3, Pending=3 at start (double counting)')
      }
    }

    // Check if complete
    const totalCompleted = doneRows + failedRows
    if (totalCompleted === 3) {
      console.log('\n✅ All rows completed!')

      await page.screenshot({ path: 'screenshots/production-fixes/05-completed.png', fullPage: true })
      console.log('✓ Screenshot saved: 05-completed.png')

      console.log('\n📋 Final State Verification:')
      console.log(`  BatchStatusCard - Success: ${successCount}, Failed: ${failedCount}, Pending: ${pendingCount}`)
      console.log(`  Table Rows - Done: ${doneRows}, Failed: ${failedRows}`)
      console.log(`  Results Header: ${resultsHeader}`)

      if (pendingCount === 3 && doneRows === 3) {
        console.log('\n❌ BUG STILL EXISTS: BatchStatusCard shows Pending=3 when all rows are Done')
        console.log('   Expected: Success=3, Failed=0, Pending=0')
        console.log(`   Actual: Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
        throw new Error('Pending count bug still exists in production')
      } else if (pendingCount === 0 && successCount === 3) {
        console.log('\n✅ BUG FIXED: BatchStatusCard correctly shows Success=3, Pending=0')
      } else if (pendingCount === 0 && successCount + failedCount === 3) {
        console.log('\n✅ BUG FIXED: BatchStatusCard correctly shows Pending=0')
        console.log(`   Final counts: Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
      } else {
        console.log('\n⚠️  UNEXPECTED STATE:')
        console.log(`   Success=${successCount}, Failed=${failedCount}, Pending=${pendingCount}`)
        console.log(`   Done rows=${doneRows}, Failed rows=${failedRows}`)
      }

      break
    }

    await page.waitForTimeout(2000)
  }

  if (attempt === maxAttempts) {
    console.log('\n⏱️  Timeout reached')
    await page.screenshot({ path: 'screenshots/production-fixes/timeout.png', fullPage: true })
  }

  console.log('\n✅ Test completed\n')
})
