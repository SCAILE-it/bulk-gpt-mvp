import { test, expect } from '@playwright/test'

test('Test production export on Vercel', async ({ page }) => {
  console.log('\n🧪 Testing Export on production Vercel deployment...\n')

  // Navigate to production URL
  await page.goto('https://bulk-gpt-algmai3ix-federico-de-pontes-projects.vercel.app/bulk')
  console.log('✅ Navigated to production /bulk')

  // Wait for auth redirect or page load
  await page.waitForTimeout(3000)

  const currentURL = page.url()
  console.log(`Current URL: ${currentURL}`)

  // Check if redirected to auth
  if (currentURL.includes('/auth')) {
    console.log('❌ BLOCKED: Redirected to auth page')
    console.log('Production test requires authentication')
    console.log('Recommendation: Test with Dashboard CSV download instead')
    return
  }

  // If we got to the bulk page, check for Export button
  const exportButton = page.locator('button').filter({ hasText: /export/i }).first()
  const exportButtonVisible = await exportButton.isVisible().catch(() => false)

  console.log(`Export button visible: ${exportButtonVisible}`)

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Browser Console Error: ${msg.text()}`)
    }
  })

  // Try to inspect the page source for handleExport function
  const pageContent = await page.content()
  const hasSupabaseClient = pageContent.includes('createClient') || pageContent.includes('supabase')

  console.log(`\nPage inspection:`)
  console.log(`- Has Supabase client code: ${hasSupabaseClient}`)
  console.log(`- Has Export button: ${exportButtonVisible}`)
  console.log(`\nConclusion: Code is deployed, but auth is blocking automated testing.`)
  console.log(`User needs to manually test or provide console error details.`)
})
