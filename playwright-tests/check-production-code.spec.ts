import { test } from '@playwright/test'

test('Check if Export fix code is deployed to production', async ({ page }) => {
  console.log('\n🔍 PRODUCTION CODE VERIFICATION\n')
  console.log('Testing URL: https://bulk-gpt-app.vercel.app')

  // Navigate to production /bulk page (will redirect to auth)
  await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'networkidle' })

  // Get all loaded JavaScript files
  const scripts = await page.$$eval('script[src]', scripts => scripts.map(s => s.src))
  console.log(`\n📦 Found ${scripts.length} JavaScript files`)

  // Find the bulk page chunk
  const bulkPageScript = scripts.find(src => src.includes('/bulk/page') || src.includes('app-pages'))

  if (!bulkPageScript) {
    console.log('❌ Could not find bulk page JavaScript')
    console.log('All scripts:', scripts.slice(0, 5))
    return
  }

  const shortUrl = bulkPageScript.length > 80 ? bulkPageScript.substring(0, 80) + '...' : bulkPageScript
  console.log(`\n📥 Downloading: ${shortUrl}`)

  // Fetch and analyze the JavaScript
  const response = await page.request.get(bulkPageScript)
  const jsCode = await response.text()

  console.log(`\n📊 JavaScript size: ${(jsCode.length / 1024).toFixed(2)} KB`)

  // Search for Export fix indicators
  const hasCreateClient = jsCode.includes('createClient')
  const hasBatchResults = jsCode.includes('batch_results')
  const hasHandleExport = jsCode.includes('handleExport')
  const hasFromMethod = jsCode.includes('.from(')

  console.log('\n🔍 Code Analysis Results:')
  console.log(`  createClient found: ${hasCreateClient ? '✅ YES' : '❌ NO'}`)
  console.log(`  batch_results found: ${hasBatchResults ? '✅ YES' : '❌ NO'}`)
  console.log(`  handleExport found: ${hasHandleExport ? '✅ YES' : '❌ NO'}`)
  console.log(`  .from() method found: ${hasFromMethod ? '✅ YES' : '❌ NO'}`)

  if (hasCreateClient && hasBatchResults && hasHandleExport) {
    console.log('\n✅ EXPORT FIX IS DEPLOYED TO PRODUCTION!')
    console.log('The code includes:')
    console.log('  - Supabase createClient')
    console.log('  - batch_results table reference')
    console.log('  - handleExport function')
  } else {
    console.log('\n❌ EXPORT FIX NOT FOUND IN PRODUCTION CODE')
    console.log('Production may be serving old cached code')
  }

  // Check for file upload fix (className="hidden")
  const hasHiddenClass = jsCode.includes('className:"hidden"') || jsCode.includes('className:\\"hidden\\"')
  console.log(`\n📁 File Upload Fix:`)
  console.log(`  File input hidden class: ${hasHiddenClass ? '✅ YES' : '❌ NO'}`)
})
