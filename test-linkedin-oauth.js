/**
 * Quick test script to verify LinkedIn OAuth button is present and functional
 * Uses Playwright to test the production deployment
 */

const { chromium } = require('playwright')

async function testLinkedInOAuth() {
  console.log('🧪 Testing LinkedIn OAuth on production...\n')
  
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    // Navigate to auth page
    console.log('📍 Navigating to https://bulk-gpt-app.vercel.app/auth...')
    await page.goto('https://bulk-gpt-app.vercel.app/auth', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // Wait for page to fully load
    
    // Check if LinkedIn button exists
    console.log('🔍 Checking for LinkedIn button...')
    const linkedInButton = page.locator('button:has-text("Continue with LinkedIn")')
    const isVisible = await linkedInButton.isVisible()
    
    if (!isVisible) {
      console.error('❌ LinkedIn button NOT found!')
      await page.screenshot({ path: 'test-linkedin-not-found.png', fullPage: true })
      console.log('📸 Screenshot saved: test-linkedin-not-found.png')
      return false
    }
    
    console.log('✅ LinkedIn button found!')
    
    // Check button styling
    const buttonStyles = await linkedInButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        display: styles.display,
      }
    })
    
    console.log('🎨 Button styles:', buttonStyles)
    
    // Check if button is enabled
    const isEnabled = await linkedInButton.isEnabled()
    console.log(`🔘 Button enabled: ${isEnabled}`)
    
    // Check for "Or" divider (more specific selector)
    const orDivider = page.locator('span.bg-card:has-text("Or")')
    const hasOrDivider = await orDivider.first().isVisible()
    console.log(`📊 "Or" divider visible: ${hasOrDivider}`)
    
    // Test click (will redirect to LinkedIn)
    console.log('\n🖱️  Clicking LinkedIn button...')
    const [response] = await Promise.all([
      page.waitForResponse((response) => 
        response.url().includes('linkedin.com') || 
        response.url().includes('supabase.co') ||
        response.status() !== 200
      , { timeout: 5000 }).catch(() => null),
      linkedInButton.click()
    ])
    
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    console.log(`🌐 Current URL: ${currentUrl}`)
    
    if (currentUrl.includes('linkedin.com')) {
      console.log('✅ Successfully redirected to LinkedIn OAuth!')
      return true
    } else if (currentUrl.includes('/auth')) {
      // Check for error message
      const errorMessage = await page.locator('[role="alert"]').isVisible()
      if (errorMessage) {
        const errorText = await page.locator('[role="alert"]').textContent()
        console.log(`⚠️  Error message: ${errorText}`)
      }
      console.log('⚠️  Still on auth page - OAuth may not be configured')
      return false
    } else {
      console.log(`ℹ️  Redirected to: ${currentUrl}`)
      return true
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    await page.screenshot({ path: 'test-linkedin-error.png', fullPage: true })
    console.log('📸 Screenshot saved: test-linkedin-error.png')
    return false
  } finally {
    await browser.close()
  }
}

// Run test
testLinkedInOAuth()
  .then((success) => {
    if (success) {
      console.log('\n✅ LinkedIn OAuth test PASSED')
      process.exit(0)
    } else {
      console.log('\n❌ LinkedIn OAuth test FAILED')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n💥 Test crashed:', error)
    process.exit(1)
  })

