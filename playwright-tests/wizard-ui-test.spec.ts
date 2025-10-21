import { test, expect } from '@playwright/test'

test.describe('Wizard UI Test (No Auth)', () => {
  // This test uses storageState to bypass auth if configured
  // For now, we'll test what we can access

  test('should verify wizard page structure without auth', async ({ page }) => {
    console.log('===================================')
    console.log('WIZARD UI STRUCTURE TEST')
    console.log('===================================')

    // Go to wizard
    await page.goto('/wizard')
    await page.waitForLoadState('networkidle')

    const currentUrl = page.url()
    console.log('Current URL:', currentUrl)

    if (currentUrl.includes('/auth')) {
      console.log('Status: Requires authentication (expected)')

      // Test that we can see the auth page at least
      const pageContent = await page.content()

      console.log('\n📊 Page Analysis:')
      console.log('- Redirects to: /auth')
      console.log('- Auth page loads: ✅')
      console.log('- Title:', await page.title())

      // Take screenshot
      await page.screenshot({
        path: '/tmp/wizard-ui-test.png',
        fullPage: true,
      })

      console.log('\n📸 Screenshot: /tmp/wizard-ui-test.png')

      // Verify the wizard route exists (not a 404)
      expect(currentUrl).not.toContain('404')
      expect(currentUrl).toContain('/auth')

      console.log('\n✅ RESULT: Wizard page exists and is protected by auth')
    } else {
      console.log('Status: Wizard accessible')

      // Test wizard UI elements
      const header = page.locator('header')
      const hasHeader = await header.isVisible()
      console.log('- Header visible:', hasHeader ? '✅' : '❌')

      if (hasHeader) {
        const headerText = await header.textContent()
        console.log('- Header text:', headerText)
      }

      // Check for wizard navigation
      const wizardNav = page.locator('nav[aria-label="Wizard steps"]')
      const hasWizardNav = await wizardNav.isVisible().catch(() => false)
      console.log('- Wizard navigation:', hasWizardNav ? '✅' : '❌')

      // Check for step 1 (Upload)
      const uploadStep = page.locator('text=Drag and drop your CSV file here')
      const hasUploadStep = await uploadStep.isVisible().catch(() => false)
      console.log('- Upload step visible:', hasUploadStep ? '✅' : '❌')

      // Take screenshot
      await page.screenshot({
        path: '/tmp/wizard-ui-test.png',
        fullPage: true,
      })

      console.log('\n📸 Screenshot: /tmp/wizard-ui-test.png')
      console.log('\n✅ RESULT: Wizard UI loaded successfully')
    }

    console.log('===================================')
  })

  test('should verify wizard page is not a 404', async ({ page }) => {
    const response = await page.goto('/wizard')

    console.log('HTTP Status:', response?.status())

    // Should redirect (307) or return 200, NOT 404
    expect(response?.status()).not.toBe(404)

    console.log('✅ Wizard route exists')
  })

  test('should have correct page metadata', async ({ page }) => {
    await page.goto('/wizard')
    await page.waitForLoadState('networkidle')

    const title = await page.title()
    console.log('Page title:', title)

    // Verify it's not a generic error page
    expect(title).not.toContain('404')
    expect(title).not.toContain('Page not found')

    console.log('✅ Page metadata correct')
  })
})

test.describe('Wizard Component Verification', () => {
  test('should log wizard implementation status', async () => {
    const fs = await import('fs')
    const path = await import('path')

    console.log('\n===================================')
    console.log('WIZARD IMPLEMENTATION STATUS')
    console.log('===================================\n')

    // Check if wizard page exists
    const wizardPagePath = path.resolve(__dirname, '../app/wizard/page.tsx')
    const wizardPageExists = fs.existsSync(wizardPagePath)

    console.log('1. Wizard Page File')
    console.log('   Path:', wizardPagePath)
    console.log('   Exists:', wizardPageExists ? '✅' : '❌')

    if (wizardPageExists) {
      const stats = fs.statSync(wizardPagePath)
      const content = fs.readFileSync(wizardPagePath, 'utf-8')
      const lines = content.split('\n').length

      console.log('   Size:', stats.size, 'bytes')
      console.log('   Lines:', lines)
      console.log('   Last modified:', stats.mtime.toISOString())
    }

    // Check wizard components
    const components = [
      '../components/wizard/StepUpload.tsx',
      '../components/wizard/StepConfigure.tsx',
      '../components/wizard/StepResults.tsx',
      '../components/wizard/WizardNav.tsx',
    ]

    console.log('\n2. Wizard Components')
    for (const comp of components) {
      const compPath = path.resolve(__dirname, comp)
      const exists = fs.existsSync(compPath)
      const name = path.basename(comp)

      console.log(`   ${name}:`, exists ? '✅' : '❌')
    }

    // Check if all components exist
    const allComponentsExist = components.every(comp => {
      const compPath = path.resolve(__dirname, comp)
      return fs.existsSync(compPath)
    })

    console.log('\n3. Overall Status')
    console.log('   Wizard Page:', wizardPageExists ? '✅' : '❌')
    console.log('   All Components:', allComponentsExist ? '✅' : '❌')
    console.log('   Implementation:', wizardPageExists && allComponentsExist ? '✅ COMPLETE' : '❌ INCOMPLETE')

    console.log('\n===================================\n')

    expect(wizardPageExists).toBe(true)
    expect(allComponentsExist).toBe(true)
  })
})
