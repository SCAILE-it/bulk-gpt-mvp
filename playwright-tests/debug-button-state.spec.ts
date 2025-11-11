/**
 * Minimal isolated test to debug button disabled state
 * Focus: Understanding why Run All button stays disabled
 */

import { test } from '@playwright/test'

const PROD_URL = 'https://bulk-gpt-app.vercel.app'
const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!'
}

test.use({ storageState: undefined })

test('Debug button state with console logs', async ({ page }) => {
  test.setTimeout(180000) // 3 minutes

  console.log('\n🔍 Minimal test: Debug button disabled state\n')

  // Step 1: Login
  console.log('🔐 Step 1: Authenticating...')
  await page.goto(`${PROD_URL}/auth`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#email', { timeout: 30000 })
  await page.locator('#email').fill(TEST_USER.email)
  await page.locator('#password').fill(TEST_USER.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/bulk', { timeout: 30000 })
  console.log('✓ Authenticated\n')

  // Step 2: Inject console log capturing
  console.log('📝 Step 2: Injecting debug logging...')
  await page.addScriptTag({
    content: `
      // Capture all console logs
      const originalLog = console.log;
      window.capturedLogs = [];
      console.log = function(...args) {
        window.capturedLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        originalLog.apply(console, args);
      };
    `
  })
  console.log('✓ Debug logging injected\n')

  // Step 3: Upload CSV
  console.log('📄 Step 3: Uploading CSV...')
  const csvContent = 'provider,category\\nAWS,cloud\\nGCP,cloud\\nAzure,cloud'

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.locator('button:has-text("Browse Files")').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent),
  })

  // Wait for CSV processing
  await page.waitForSelector('[data-testid="row-count-display"]', { timeout: 10000 })
  console.log('✓ CSV uploaded\n')

  // Step 4: Configure output columns
  console.log('⚙️  Step 4: Configuring output columns...')
  for (const col of ['name', 'type', 'region']) {
    const fieldInput = page.locator('input[placeholder="field..."]').first()
    await fieldInput.fill(col)
    await fieldInput.press('Enter')
    await page.waitForTimeout(500)
  }
  console.log('✓ Output columns configured\n')

  // Step 5: Set prompt
  console.log('📝 Step 5: Setting prompt...')
  const promptTextarea = page.locator('textarea').first()
  await promptTextarea.fill('Research {{provider}} as a cloud provider. Return JSON with name, type, and region fields.')
  console.log('✓ Prompt set\n')

  // Step 6: Wait and capture state
  console.log('⏱️  Step 6: Waiting for validation (5 seconds)...')
  await page.waitForTimeout(5000)

  // Step 7: Evaluate button state and log details
  console.log('\n🔍 Step 7: Analyzing button state...\n')

  const debugInfo = await page.evaluate(() => {
    const button = document.querySelector('button[data-testid="run-button"]') as HTMLButtonElement

    return {
      buttonExists: !!button,
      isDisabled: button?.disabled,
      buttonHTML: button?.outerHTML.substring(0, 300),
      csvDataExists: !!(window as any).csvData,
      promptValue: (document.querySelector('textarea') as HTMLTextAreaElement)?.value || '',
      capturedLogs: (window as any).capturedLogs || []
    }
  })

  console.log('Button State:')
  console.log(`  Exists: ${debugInfo.buttonExists}`)
  console.log(`  Disabled: ${debugInfo.isDisabled}`)
  console.log(`  HTML: ${debugInfo.buttonHTML}`)
  console.log('')
  console.log('Form State:')
  console.log(`  CSV Data Exists: ${debugInfo.csvDataExists}`)
  console.log(`  Prompt: ${debugInfo.promptValue.substring(0, 50)}...`)
  console.log('')
  console.log('Captured Console Logs:')
  debugInfo.capturedLogs.forEach((log: string, i: number) => {
    if (log.includes('validation') || log.includes('disabled') || log.includes('csvData') || log.includes('prompt')) {
      console.log(`  [${i}] ${log}`)
    }
  })

  // Step 8: Try to inspect React state via devtools
  console.log('\n🔍 Step 8: Attempting to inspect React state...\n')

  const reactState = await page.evaluate(() => {
    // Try to find React fiber
    const button = document.querySelector('button[data-testid="run-button"]')
    if (!button) return { error: 'Button not found' }

    // React stores fiber on element properties
    const fiberKey = Object.keys(button).find(key => key.startsWith('__reactFiber'))
    if (!fiberKey) return { error: 'React fiber not found' }

    const fiber = (button as any)[fiberKey]
    if (!fiber) return { error: 'Fiber is null' }

    // Walk up to find component with props/state
    let current = fiber
    let depth = 0
    while (current && depth < 20) {
      if (current.memoizedProps && current.memoizedProps.disabled !== undefined) {
        return {
          componentType: current.type?.name || 'Unknown',
          disabled: current.memoizedProps.disabled,
          props: Object.keys(current.memoizedProps)
        }
      }
      current = current.return
      depth++
    }

    return { error: 'Could not find component with disabled prop' }
  })

  console.log('React State:')
  console.log(JSON.stringify(reactState, null, 2))

  // Step 9: Take screenshot
  await page.screenshot({ path: 'screenshots/debug-button-state.png', fullPage: true })
  console.log('\n✅ Screenshot saved: screenshots/debug-button-state.png\n')
})
