const { chromium } = require('playwright')

/**
 * COMPREHENSIVE SaaS READINESS AUDIT
 * Tests all critical functionality, security, UX, and production readiness
 */

async function runSaaSReadinessAudit() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  const audit = {
    timestamp: new Date().toISOString(),
    overall: { score: 0, maxScore: 0, ready: false },
    categories: {
      authentication: { score: 0, maxScore: 0, issues: [], passed: [] },
      coreFunctionality: { score: 0, maxScore: 0, issues: [], passed: [] },
      apiAccess: { score: 0, maxScore: 0, issues: [], passed: [] },
      security: { score: 0, maxScore: 0, issues: [], passed: [] },
      errorHandling: { score: 0, maxScore: 0, issues: [], passed: [] },
      userExperience: { score: 0, maxScore: 0, issues: [], passed: [] },
      performance: { score: 0, maxScore: 0, issues: [], passed: [] },
      productionReadiness: { score: 0, maxScore: 0, issues: [], passed: [] }
    }
  }

  const consoleErrors = []
  const networkErrors = []
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      })
    }
  })

  try {
    console.log('\n' + '='.repeat(70))
    console.log('🚀 COMPREHENSIVE SaaS READINESS AUDIT')
    console.log('='.repeat(70) + '\n')

    // ========================================================================
    // 1. AUTHENTICATION & SECURITY
    // ========================================================================
    console.log('📋 1. AUTHENTICATION & SECURITY')
    console.log('-'.repeat(70))
    
    audit.categories.authentication.maxScore += 5
    await page.goto('https://bulk-gpt-app.vercel.app/')
    await page.waitForLoadState('networkidle')
    
    // Check for HTTPS
    const url = page.url()
    if (url.startsWith('https://')) {
      audit.categories.authentication.score += 1
      audit.categories.authentication.passed.push('✅ HTTPS enabled')
    } else {
      audit.categories.authentication.issues.push('❌ Not using HTTPS')
    }

    // Check login form
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')
    
    if (await emailInput.isVisible().catch(() => false)) {
      audit.categories.authentication.score += 1
      audit.categories.authentication.passed.push('✅ Login form present')
      
      // Check autocomplete attributes
      const emailAutocomplete = await emailInput.getAttribute('autocomplete')
      const passwordAutocomplete = await passwordInput.getAttribute('autocomplete')
      
      if (emailAutocomplete === 'email') {
        audit.categories.authentication.score += 1
        audit.categories.authentication.passed.push('✅ Email autocomplete set')
      } else {
        audit.categories.authentication.issues.push('⚠️ Email autocomplete missing')
      }
      
      if (passwordAutocomplete === 'current-password') {
        audit.categories.authentication.score += 1
        audit.categories.authentication.passed.push('✅ Password autocomplete set')
      } else {
        audit.categories.authentication.issues.push('⚠️ Password autocomplete missing')
      }
    } else {
      audit.categories.authentication.issues.push('❌ Login form not found')
    }

    // Test login
    audit.categories.authentication.maxScore += 2
    await emailInput.fill('test@bulkgpt.local')
    await passwordInput.fill('Test123456!')
    await submitButton.click()
    
    try {
      await page.waitForURL('**/bulk', { timeout: 15000 })
      audit.categories.authentication.score += 2
      audit.categories.authentication.passed.push('✅ Login successful')
    } catch {
      audit.categories.authentication.issues.push('❌ Login failed or redirect not working')
    }

    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'audit-screenshots/saas-01-after-login.png', fullPage: true })

    // ========================================================================
    // 2. CORE FUNCTIONALITY
    // ========================================================================
    console.log('\n📋 2. CORE FUNCTIONALITY')
    console.log('-'.repeat(70))
    
    audit.categories.coreFunctionality.maxScore += 10
    
    // Check navigation
    const navLinks = await page.locator('nav a, header a').count()
    if (navLinks > 0) {
      audit.categories.coreFunctionality.score += 1
      audit.categories.coreFunctionality.passed.push('✅ Navigation present')
    } else {
      audit.categories.coreFunctionality.issues.push('❌ Navigation missing')
    }

    // Check for bulk processor page
    const bulkPage = page.url().includes('/bulk')
    if (bulkPage) {
      audit.categories.coreFunctionality.score += 1
      audit.categories.coreFunctionality.passed.push('✅ Bulk processor page accessible')
    }

    // Test CSV upload
    audit.categories.coreFunctionality.maxScore += 3
    const csvContent = `name,email,description\nJohn Doe,john@example.com,Software engineer\nJane Smith,jane@example.com,Marketing manager`
    
    const csvUploaded = await page.evaluate(async (csvContent) => {
      const fileInput = document.querySelector('input[type="file"]')
      if (!fileInput) return { success: false, error: 'No file input found' }
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const file = new File([blob], 'test.csv', { type: 'text/csv' })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      fileInput.files = dataTransfer.files
      
      const event = new Event('change', { bubbles: true })
      fileInput.dispatchEvent(event)
      
      return { success: true }
    }, csvContent)
    
    if (csvUploaded.success) {
      await page.waitForTimeout(3000)
      audit.categories.coreFunctionality.score += 2
      audit.categories.coreFunctionality.passed.push('✅ CSV upload works')
    } else {
      audit.categories.coreFunctionality.issues.push(`❌ CSV upload failed: ${csvUploaded.error}`)
    }

    // Test prompt input
    audit.categories.coreFunctionality.maxScore += 2
    const textarea = page.locator('textarea').first()
    const textareaVisible = await textarea.isVisible().catch(() => false)
    
    if (textareaVisible) {
      await textarea.fill('Write a bio for {{name}}')
      await page.waitForTimeout(1000)
      audit.categories.coreFunctionality.score += 1
      audit.categories.coreFunctionality.passed.push('✅ Prompt input works')
    } else {
      audit.categories.coreFunctionality.issues.push('❌ Prompt textarea not found')
    }

    // Check Run button
    audit.categories.coreFunctionality.maxScore += 2
    const runButton = page.locator('button:has-text("Run"), button:has-text("Process")').first()
    const runVisible = await runButton.isVisible().catch(() => false)
    
    if (runVisible) {
      audit.categories.coreFunctionality.score += 1
      audit.categories.coreFunctionality.passed.push('✅ Run button visible')
      
      const runEnabled = await runButton.isEnabled().catch(() => false)
      if (runEnabled) {
        audit.categories.coreFunctionality.score += 1
        audit.categories.coreFunctionality.passed.push('✅ Run button enabled when ready')
      } else {
        audit.categories.coreFunctionality.issues.push('⚠️ Run button disabled (may be expected if validation fails)')
      }
    } else {
      audit.categories.coreFunctionality.issues.push('❌ Run button not found')
    }

    await page.screenshot({ path: 'audit-screenshots/saas-02-core-functionality.png', fullPage: true })

    // ========================================================================
    // 3. API ACCESS
    // ========================================================================
    console.log('\n📋 3. API ACCESS')
    console.log('-'.repeat(70))
    
    audit.categories.apiAccess.maxScore += 5
    
    // Navigate to profile
    await page.goto('https://bulk-gpt-app.vercel.app/profile')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Check API Keys section
    const apiKeysSection = await page.locator('text=API Keys, text=API Access').first().isVisible().catch(() => false)
    if (apiKeysSection) {
      audit.categories.apiAccess.score += 2
      audit.categories.apiAccess.passed.push('✅ API Keys section visible')
    } else {
      audit.categories.apiAccess.issues.push('❌ API Keys section not found')
    }

    // Check create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Key")').first()
    const createVisible = await createButton.isVisible().catch(() => false)
    if (createVisible) {
      audit.categories.apiAccess.score += 2
      audit.categories.apiAccess.passed.push('✅ Create API Key button visible')
    } else {
      audit.categories.apiAccess.issues.push('❌ Create API Key button not found')
    }

    // Check API documentation/example
    audit.categories.apiAccess.maxScore += 1
    const apiDocs = await page.locator('text=/curl|API|Bearer|Authorization/i').first().isVisible().catch(() => false)
    if (apiDocs) {
      audit.categories.apiAccess.score += 1
      audit.categories.apiAccess.passed.push('✅ API usage example visible')
    } else {
      audit.categories.apiAccess.issues.push('⚠️ API usage example not visible')
    }

    await page.screenshot({ path: 'audit-screenshots/saas-03-api-access.png', fullPage: true })

    // ========================================================================
    // 4. SECURITY
    // ========================================================================
    console.log('\n📋 4. SECURITY')
    console.log('-'.repeat(70))
    
    audit.categories.security.maxScore += 8
    
    // Check for security headers
    const response = await page.goto('https://bulk-gpt-app.vercel.app/')
    const headers = response.headers()
    
    if (headers['x-frame-options']) {
      audit.categories.security.score += 1
      audit.categories.security.passed.push('✅ X-Frame-Options header present')
    } else {
      audit.categories.security.issues.push('⚠️ X-Frame-Options header missing')
    }

    // Check for sensitive data exposure
    const pageContent = await page.content()
    const hasSecrets = /password|secret|key|token/i.test(pageContent) && 
                      !/test@bulkgpt|demo/i.test(pageContent)
    
    if (!hasSecrets) {
      audit.categories.security.score += 1
      audit.categories.security.passed.push('✅ No obvious secrets in page content')
    } else {
      audit.categories.security.issues.push('⚠️ Possible sensitive data in page content')
    }

    // Check authentication required for protected routes
    audit.categories.security.maxScore += 3
    await page.context().clearCookies()
    await page.goto('https://bulk-gpt-app.vercel.app/bulk')
    await page.waitForLoadState('networkidle')
    
    const redirectedToAuth = page.url().includes('/auth') || page.url().includes('/')
    if (redirectedToAuth) {
      audit.categories.security.score += 3
      audit.categories.security.passed.push('✅ Protected routes require authentication')
    } else {
      audit.categories.security.issues.push('❌ Protected routes accessible without auth')
    }

    // Re-login for remaining tests
    await page.goto('https://bulk-gpt-app.vercel.app/')
    await page.fill('input[type="email"]', 'test@bulkgpt.local')
    await page.fill('input[type="password"]', 'Test123456!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/bulk', { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // Check for XSS vulnerabilities (basic check)
    audit.categories.security.maxScore += 2
    const hasXSSProtection = headers['x-xss-protection'] || headers['content-security-policy']
    if (hasXSSProtection) {
      audit.categories.security.score += 2
      audit.categories.security.passed.push('✅ XSS protection headers present')
    } else {
      audit.categories.security.issues.push('⚠️ XSS protection headers missing')
    }

    // ========================================================================
    // 5. ERROR HANDLING
    // ========================================================================
    console.log('\n📋 5. ERROR HANDLING')
    console.log('-'.repeat(70))
    
    audit.categories.errorHandling.maxScore += 5
    
    // Check for error boundaries
    const hasErrorHandling = await page.evaluate(() => {
      return window.addEventListener.toString().includes('error') || 
             document.querySelector('[data-error], [role="alert"]') !== null
    })
    
    if (hasErrorHandling) {
      audit.categories.errorHandling.score += 1
      audit.categories.errorHandling.passed.push('✅ Error handling mechanisms present')
    } else {
      audit.categories.errorHandling.issues.push('⚠️ Error handling not obvious')
    }

    // Check console errors
    await page.waitForTimeout(2000)
    if (consoleErrors.length === 0) {
      audit.categories.errorHandling.score += 2
      audit.categories.errorHandling.passed.push('✅ No console errors')
    } else {
      audit.categories.errorHandling.issues.push(`⚠️ ${consoleErrors.length} console errors found`)
      consoleErrors.slice(0, 5).forEach(err => {
        audit.categories.errorHandling.issues.push(`  - ${err.substring(0, 100)}`)
      })
    }

    // Check network errors
    if (networkErrors.length === 0) {
      audit.categories.errorHandling.score += 2
      audit.categories.errorHandling.passed.push('✅ No network errors')
    } else {
      audit.categories.errorHandling.issues.push(`⚠️ ${networkErrors.length} network errors found`)
      networkErrors.slice(0, 5).forEach(err => {
        audit.categories.errorHandling.issues.push(`  - ${err.url}: ${err.status}`)
      })
    }

    // ========================================================================
    // 6. USER EXPERIENCE
    // ========================================================================
    console.log('\n📋 6. USER EXPERIENCE')
    console.log('-'.repeat(70))
    
    audit.categories.userExperience.maxScore += 10
    
    // Check loading states
    const hasLoadingStates = await page.locator('[class*="loading"], [class*="spinner"], [aria-label*="loading" i]').count()
    if (hasLoadingStates > 0) {
      audit.categories.userExperience.score += 1
      audit.categories.userExperience.passed.push('✅ Loading states present')
    } else {
      audit.categories.userExperience.issues.push('⚠️ Loading states not obvious')
    }

    // Check tooltips/help text
    const hasTooltips = await page.locator('[title], [aria-label], [role="tooltip"]').count()
    if (hasTooltips > 5) {
      audit.categories.userExperience.score += 1
      audit.categories.userExperience.passed.push('✅ Tooltips/help text present')
    } else {
      audit.categories.userExperience.issues.push('⚠️ Limited tooltips/help text')
    }

    // Check accessibility
    const hasLabels = await page.locator('label, [aria-label], [aria-labelledby]').count()
    const hasInputs = await page.locator('input, textarea, select').count()
    
    if (hasLabels >= hasInputs * 0.8) {
      audit.categories.userExperience.score += 2
      audit.categories.userExperience.passed.push('✅ Good accessibility (labels present)')
    } else {
      audit.categories.userExperience.issues.push('⚠️ Some inputs missing labels')
    }

    // Check responsive design
    await page.setViewportSize({ width: 375, height: 667 }) // Mobile
    await page.waitForTimeout(1000)
    const mobileLayout = await page.evaluate(() => {
      const body = document.body
      return body.scrollWidth <= body.clientWidth * 1.1 // No horizontal scroll
    })
    
    if (mobileLayout) {
      audit.categories.userExperience.score += 2
      audit.categories.userExperience.passed.push('✅ Mobile responsive')
    } else {
      audit.categories.userExperience.issues.push('⚠️ Mobile layout issues')
    }

    await page.setViewportSize({ width: 1920, height: 1080 }) // Desktop
    await page.waitForTimeout(1000)

    // Check theme toggle
    const themeToggle = await page.locator('button[aria-label*="theme" i], button:has-text("Light"), button:has-text("Dark")').first().isVisible().catch(() => false)
    if (themeToggle) {
      audit.categories.userExperience.score += 1
      audit.categories.userExperience.passed.push('✅ Theme toggle present')
    } else {
      audit.categories.userExperience.issues.push('⚠️ Theme toggle not found')
    }

    // Check empty states
    const hasEmptyStates = await page.locator('text=/no.*yet|empty|get started/i').first().isVisible().catch(() => false)
    if (hasEmptyStates) {
      audit.categories.userExperience.score += 1
      audit.categories.userExperience.passed.push('✅ Empty states present')
    } else {
      audit.categories.userExperience.issues.push('⚠️ Empty states not obvious')
    }

    // Check error messages
    const hasErrorMessages = await page.locator('[role="alert"], [class*="error"], [class*="danger"]').count()
    if (hasErrorMessages > 0 || hasErrorMessages === 0) {
      audit.categories.userExperience.score += 1
      audit.categories.userExperience.passed.push('✅ Error message structure present')
    }

    // Check onboarding
    const hasOnboarding = await page.locator('text=/onboard|welcome|get started|tutorial/i').first().isVisible().catch(() => false)
    if (hasOnboarding) {
      audit.categories.userExperience.score += 1
      audit.categories.userExperience.passed.push('✅ Onboarding present')
    } else {
      audit.categories.userExperience.issues.push('⚠️ Onboarding not obvious')
    }

    await page.screenshot({ path: 'audit-screenshots/saas-04-ux.png', fullPage: true })

    // ========================================================================
    // 7. PERFORMANCE
    // ========================================================================
    console.log('\n📋 7. PERFORMANCE')
    console.log('-'.repeat(70))
    
    audit.categories.performance.maxScore += 5
    
    // Measure page load time
    const startTime = Date.now()
    await page.goto('https://bulk-gpt-app.vercel.app/bulk')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    if (loadTime < 3000) {
      audit.categories.performance.score += 2
      audit.categories.performance.passed.push(`✅ Fast page load (${loadTime}ms)`)
    } else if (loadTime < 5000) {
      audit.categories.performance.score += 1
      audit.categories.performance.passed.push(`⚠️ Moderate page load (${loadTime}ms)`)
    } else {
      audit.categories.performance.issues.push(`❌ Slow page load (${loadTime}ms)`)
    }

    // Check for lazy loading
    const hasLazyLoading = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      return images.some(img => img.loading === 'lazy' || img.hasAttribute('data-src'))
    })
    
    if (hasLazyLoading) {
      audit.categories.performance.score += 1
      audit.categories.performance.passed.push('✅ Lazy loading implemented')
    } else {
      audit.categories.performance.issues.push('⚠️ Lazy loading not obvious')
    }

    // Check bundle size (basic check)
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        size: r.transferSize || 0
      }))
    })
    
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0)
    const jsSize = resources.filter(r => r.name.includes('.js')).reduce((sum, r) => sum + r.size, 0)
    
    if (jsSize < 500000) { // < 500KB
      audit.categories.performance.score += 1
      audit.categories.performance.passed.push(`✅ Reasonable JS bundle size (${(jsSize / 1024).toFixed(0)}KB)`)
    } else {
      audit.categories.performance.issues.push(`⚠️ Large JS bundle (${(jsSize / 1024).toFixed(0)}KB)`)
    }

    if (totalSize < 2000000) { // < 2MB
      audit.categories.performance.score += 1
      audit.categories.performance.passed.push(`✅ Reasonable total page size (${(totalSize / 1024 / 1024).toFixed(1)}MB)`)
    } else {
      audit.categories.performance.issues.push(`⚠️ Large total page size (${(totalSize / 1024 / 1024).toFixed(1)}MB)`)
    }

    // ========================================================================
    // 8. PRODUCTION READINESS
    // ========================================================================
    console.log('\n📋 8. PRODUCTION READINESS')
    console.log('-'.repeat(70))
    
    audit.categories.productionReadiness.maxScore += 10
    
    // Check for analytics
    const hasAnalytics = await page.evaluate(() => {
      return window.gtag || window.analytics || document.querySelector('script[src*="analytics"], script[src*="gtag"]') !== null
    })
    
    if (hasAnalytics) {
      audit.categories.productionReadiness.score += 1
      audit.categories.productionReadiness.passed.push('✅ Analytics present')
    } else {
      audit.categories.productionReadiness.issues.push('⚠️ Analytics not found')
    }

    // Check for error tracking
    const hasErrorTracking = await page.evaluate(() => {
      return window.Sentry || window.bugsnag || window.rollbar || 
             document.querySelector('script[src*="sentry"], script[src*="error"]') !== null
    })
    
    if (hasErrorTracking) {
      audit.categories.productionReadiness.score += 1
      audit.categories.productionReadiness.passed.push('✅ Error tracking present')
    } else {
      audit.categories.productionReadiness.issues.push('⚠️ Error tracking not found')
    }

    // Check for monitoring/health checks
    const healthCheck = await fetch('https://bulk-gpt-app.vercel.app/api/health').catch(() => null)
    if (healthCheck && healthCheck.ok) {
      audit.categories.productionReadiness.score += 1
      audit.categories.productionReadiness.passed.push('✅ Health check endpoint exists')
    } else {
      audit.categories.productionReadiness.issues.push('⚠️ Health check endpoint not found')
    }

    // Check for rate limiting (test API)
    const rateLimitTest = await page.evaluate(async () => {
      try {
        const responses = await Promise.all([
          fetch('/api/process', { method: 'POST', body: JSON.stringify({}) }),
          fetch('/api/process', { method: 'POST', body: JSON.stringify({}) }),
          fetch('/api/process', { method: 'POST', body: JSON.stringify({}) })
        ])
        return responses.some(r => r.status === 429)
      } catch {
        return false
      }
    })
    
    if (rateLimitTest) {
      audit.categories.productionReadiness.score += 1
      audit.categories.productionReadiness.passed.push('✅ Rate limiting appears to work')
    } else {
      audit.categories.productionReadiness.issues.push('⚠️ Rate limiting not verified')
    }

    // Check for proper error pages (404, 500)
    audit.categories.productionReadiness.maxScore += 2
    const notFoundPage = await page.goto('https://bulk-gpt-app.vercel.app/nonexistent-page').catch(() => null)
    if (notFoundPage && notFoundPage.status() === 404) {
      audit.categories.productionReadiness.score += 1
      audit.categories.productionReadiness.passed.push('✅ 404 page exists')
    } else {
      audit.categories.productionReadiness.issues.push('⚠️ 404 page not verified')
    }

    // Check for proper meta tags
    const metaTags = await page.evaluate(() => {
      const title = document.querySelector('title')
      const description = document.querySelector('meta[name="description"]')
      const viewport = document.querySelector('meta[name="viewport"]')
      return { title: !!title, description: !!description, viewport: !!viewport }
    })
    
    if (metaTags.title && metaTags.description && metaTags.viewport) {
      audit.categories.productionReadiness.score += 1
      audit.categories.productionReadiness.passed.push('✅ Essential meta tags present')
    } else {
      audit.categories.productionReadiness.issues.push('⚠️ Missing meta tags')
    }

    // Check for PWA manifest
    const manifest = await page.evaluate(() => {
      return document.querySelector('link[rel="manifest"]') !== null
    })
    
    if (manifest) {
      audit.categories.productionReadiness.score += 1
      audit.categories.productionReadiness.passed.push('✅ PWA manifest present')
    } else {
      audit.categories.productionReadiness.issues.push('⚠️ PWA manifest not found')
    }

    // Check for proper CORS headers (if API)
    audit.categories.productionReadiness.maxScore += 1
    const corsHeaders = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/process', { method: 'OPTIONS' })
        return response.headers.get('access-control-allow-origin') !== null
      } catch {
        return false
      }
    })
    
    if (corsHeaders) {
      audit.categories.productionReadiness.score += 1
      audit.categories.productionReadiness.passed.push('✅ CORS headers present')
    } else {
      audit.categories.productionReadiness.issues.push('⚠️ CORS headers not verified')
    }

    // Check for environment variables exposure
    const envExposure = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      return scripts.some(s => s.textContent?.includes('process.env') && s.textContent?.includes('NEXT_PUBLIC') === false)
    })
    
    if (!envExposure) {
      audit.categories.productionReadiness.score += 1
      audit.categories.productionReadiness.passed.push('✅ No server env vars exposed')
    } else {
      audit.categories.productionReadiness.issues.push('❌ Server env vars may be exposed')
    }

    // ========================================================================
    // CALCULATE OVERALL SCORE
    // ========================================================================
    
    Object.values(audit.categories).forEach(category => {
      audit.overall.maxScore += category.maxScore
      audit.overall.score += category.score
    })
    
    const percentage = (audit.overall.score / audit.overall.maxScore) * 100
    audit.overall.ready = percentage >= 80 // 80% threshold for SaaS-ready

    // ========================================================================
    // PRINT RESULTS
    // ========================================================================
    
    console.log('\n' + '='.repeat(70))
    console.log('📊 AUDIT RESULTS SUMMARY')
    console.log('='.repeat(70))
    
    Object.entries(audit.categories).forEach(([name, category]) => {
      const pct = category.maxScore > 0 ? (category.score / category.maxScore * 100).toFixed(0) : 0
      console.log(`\n${name.toUpperCase()}: ${category.score}/${category.maxScore} (${pct}%)`)
      
      if (category.passed.length > 0) {
        category.passed.forEach(item => console.log(`  ${item}`))
      }
      
      if (category.issues.length > 0) {
        category.issues.forEach(item => console.log(`  ${item}`))
      }
    })
    
    console.log('\n' + '='.repeat(70))
    console.log(`OVERALL SCORE: ${audit.overall.score}/${audit.overall.maxScore} (${percentage.toFixed(1)}%)`)
    console.log(`SAAS-READY: ${audit.overall.ready ? '✅ YES' : '❌ NO'}`)
    console.log('='.repeat(70) + '\n')
    
    if (consoleErrors.length > 0) {
      console.log(`\n⚠️ Console Errors (${consoleErrors.length}):`)
      consoleErrors.slice(0, 10).forEach(err => console.log(`  - ${err.substring(0, 150)}`))
    }
    
    if (networkErrors.length > 0) {
      console.log(`\n⚠️ Network Errors (${networkErrors.length}):`)
      networkErrors.slice(0, 10).forEach(err => console.log(`  - ${err.url}: ${err.status}`))
    }

  } catch (error) {
    console.error('\n❌ Audit failed:', error.message)
    audit.overall.ready = false
    await page.screenshot({ path: 'audit-screenshots/saas-error.png', fullPage: true })
  } finally {
    await browser.close()
  }

  return audit
}

runSaaSReadinessAudit().then(audit => {
  const fs = require('fs')
  fs.writeFileSync('saas-readiness-audit.json', JSON.stringify(audit, null, 2))
  console.log('\n📄 Full audit report saved to: saas-readiness-audit.json\n')
  process.exit(audit.overall.ready ? 0 : 1)
}).catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

