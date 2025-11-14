/**
 * Test script to check what redirect URI is actually being sent to LinkedIn
 */

const { chromium } = require('playwright')

async function checkRedirectURI() {
  console.log('🔍 Checking LinkedIn OAuth redirect URI...\n')
  
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    // Navigate to auth page
    await page.goto('https://bulk-gpt-app.vercel.app/auth', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    
    // Intercept network requests
    const requests = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('linkedin.com') || url.includes('supabase.co')) {
        requests.push({
          url: url,
          method: request.method(),
          headers: request.headers(),
        })
      }
    })
    
    // Click LinkedIn button
    const linkedInButton = page.locator('button:has-text("Continue with LinkedIn")')
    await linkedInButton.click()
    
    // Wait for redirect
    await page.waitForTimeout(3000)
    
    const currentUrl = page.url()
    console.log('📍 Final URL:', currentUrl)
    console.log('\n📡 Network requests:')
    
    requests.forEach((req, i) => {
      console.log(`\n${i + 1}. ${req.method} ${req.url}`)
      
      // Parse LinkedIn OAuth URL
      if (req.url.includes('linkedin.com/oauth')) {
        const urlObj = new URL(req.url)
        console.log('   Query params:')
        urlObj.searchParams.forEach((value, key) => {
          console.log(`     ${key}: ${decodeURIComponent(value)}`)
        })
      }
    })
    
    // Extract redirect_uri from LinkedIn URL
    if (currentUrl.includes('linkedin.com')) {
      const urlObj = new URL(currentUrl)
      const redirectUri = urlObj.searchParams.get('redirect_uri')
      const redirectTo = urlObj.searchParams.get('redirect_to')
      
      console.log('\n🔑 Key Parameters:')
      console.log(`   redirect_uri (LinkedIn): ${redirectUri ? decodeURIComponent(redirectUri) : 'NOT FOUND'}`)
      console.log(`   redirect_to (Supabase): ${redirectTo ? decodeURIComponent(redirectTo) : 'NOT FOUND'}`)
      
      if (redirectUri) {
        console.log('\n⚠️  This redirect_uri must be registered in LinkedIn OAuth app!')
        console.log(`   Add this URL to LinkedIn Developer Portal → Your App → Auth → Authorized Redirect URLs:`)
        console.log(`   ${decodeURIComponent(redirectUri)}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await browser.close()
  }
}

checkRedirectURI()

