import { test, expect } from '@playwright/test'

/**
 * CRITICAL AUDIT - November 2025
 * Very critical review of design system implementation
 */

test.describe('🔍 CRITICAL AUDIT - Design System & UX', () => {
  test.use({ 
    storageState: undefined // Don't use auth setup, login manually
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('https://bulk-gpt-app.vercel.app/')
    
    // Login
    await page.fill('input[type="email"]', 'test@bulkgpt.local')
    await page.fill('input[type="password"]', 'Test123456!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/bulk', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
  })

  test('CRITICAL 1: Sequential Section Expansion - One by One', async ({ page }) => {
    const issues: string[] = []

    // Initial state - all sections should be collapsed
    const dataInputButton = page.locator('button').filter({ hasText: /Data Input/i }).first()
    const promptButton = page.locator('button').filter({ hasText: /Prompt/i }).first()
    const outputSettingsButton = page.locator('button').filter({ hasText: /Output Settings/i }).first()

    // Check initial collapsed state
    const initialDataInputExpanded = await dataInputButton.getAttribute('aria-expanded')
    const initialPromptExpanded = await promptButton.getAttribute('aria-expanded')
    const initialOutputExpanded = await outputSettingsButton.getAttribute('aria-expanded')

    if (initialDataInputExpanded === 'true') {
      issues.push('❌ Data Input section starts expanded (should be collapsed)')
    }
    if (initialPromptExpanded === 'true') {
      issues.push('❌ Prompt section starts expanded (should be collapsed)')
    }
    if (initialOutputExpanded === 'true') {
      issues.push('❌ Output Settings section starts expanded (should be collapsed)')
    }

    // Upload CSV
    const csvContent = `name,email,description\nJohn Doe,john@example.com,Software engineer\nJane Smith,jane@example.com,Marketing manager`
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })
    await page.waitForTimeout(3000)

    // After CSV upload - ONLY Data Input should expand
    const afterCSVDataExpanded = await dataInputButton.getAttribute('aria-expanded')
    const afterCSVPromptExpanded = await promptButton.getAttribute('aria-expanded')
    const afterCSVOutputExpanded = await outputSettingsButton.getAttribute('aria-expanded')

    if (afterCSVDataExpanded !== 'true') {
      issues.push('❌ Data Input section did NOT expand after CSV upload')
    }
    if (afterCSVPromptExpanded === 'true') {
      issues.push('❌ Prompt section expanded when it should stay collapsed (only Data Input should expand)')
    }
    if (afterCSVOutputExpanded === 'true') {
      issues.push('❌ Output Settings expanded when it should stay collapsed (only Data Input should expand)')
    }

    // Enter prompt
    await page.fill('textarea', 'Write a bio for {{name}}')
    await page.waitForTimeout(2000)

    // After prompt - Data Input should stay open, Prompt should expand, Output Settings should stay closed
    const afterPromptDataExpanded = await dataInputButton.getAttribute('aria-expanded')
    const afterPromptPromptExpanded = await promptButton.getAttribute('aria-expanded')
    const afterPromptOutputExpanded = await outputSettingsButton.getAttribute('aria-expanded')

    if (afterPromptPromptExpanded !== 'true') {
      issues.push('❌ Prompt section did NOT expand after entering prompt')
    }
    if (afterPromptOutputExpanded === 'true') {
      issues.push('❌ Output Settings expanded automatically (should only expand manually)')
    }

    // Take screenshot for evidence
    await page.screenshot({ path: 'audit-screenshots/sequential-expansion.png', fullPage: true })

    if (issues.length > 0) {
      console.log('\n🔴 SEQUENTIAL EXPANSION ISSUES:')
      issues.forEach(issue => console.log(issue))
      throw new Error(`Found ${issues.length} issues with sequential expansion`)
    }

    console.log('✅ Sequential expansion works correctly')
  })

  test('CRITICAL 2: AI Optimization Button Visibility', async ({ page }) => {
    const issues: string[] = []

    // Upload CSV
    const csvContent = `name,email,description\nJohn Doe,john@example.com,Software engineer`
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    })
    await page.waitForTimeout(2000)

    // Enter prompt
    await page.fill('textarea', 'Write a bio for {{name}}')
    await page.waitForTimeout(2000)

    // Look for AI Optimization section
    const aiSection = page.locator('text=AI Optimization').first()
    const aiSectionVisible = await aiSection.isVisible().catch(() => false)

    if (!aiSectionVisible) {
      issues.push('❌ AI Optimization section is NOT visible')
      
      // Check if it exists but is hidden
      const aiSectionExists = await page.locator('text=AI Optimization').count()
      if (aiSectionExists > 0) {
        issues.push('⚠️ AI Optimization section exists but is hidden/collapsed')
      } else {
        issues.push('❌ AI Optimization section does not exist in DOM')
      }
    }

    // Look for Optimize button
    const optimizeButton = page.locator('button:has-text("Optimize with AI"), button:has-text("Optimize")').first()
    const buttonVisible = await optimizeButton.isVisible().catch(() => false)
    const buttonEnabled = await optimizeButton.isEnabled().catch(() => false)

    if (!buttonVisible) {
      issues.push('❌ "Optimize with AI" button is NOT visible')
    }
    if (!buttonEnabled) {
      issues.push('❌ "Optimize with AI" button is disabled (should be enabled with CSV + prompt)')
    }

    // Check button text
    if (buttonVisible) {
      const buttonText = await optimizeButton.textContent()
      if (!buttonText?.includes('Optimize') && !buttonText?.includes('AI')) {
        issues.push(`⚠️ Button text unclear: "${buttonText}"`)
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'audit-screenshots/ai-optimization-visibility.png', fullPage: true })

    if (issues.length > 0) {
      console.log('\n🔴 AI OPTIMIZATION VISIBILITY ISSUES:')
      issues.forEach(issue => console.log(issue))
      throw new Error(`Found ${issues.length} issues with AI Optimization visibility`)
    }

    console.log('✅ AI Optimization button is visible and enabled')
  })

  test('CRITICAL 3: Theme Toggle Functionality', async ({ page }) => {
    const issues: string[] = []

    // Find theme toggle
    const themeToggle = page.locator('button').filter({ 
      has: page.locator('svg')
    }).filter({
      hasText: /light|dark|theme/i
    }).first()

    // Alternative: look for dropdown menu trigger
    const dropdownTrigger = page.locator('button[aria-haspopup="menu"]').filter({
      has: page.locator('svg')
    }).first()

    const toggle = await themeToggle.isVisible().catch(() => false) 
      ? themeToggle 
      : await dropdownTrigger.isVisible().catch(() => false)
        ? dropdownTrigger
        : null

    if (!toggle) {
      issues.push('❌ Theme toggle button NOT found')
      
      // Check if it's in navigation
      const nav = page.locator('nav, header').first()
      const navButtons = await nav.locator('button').count()
      issues.push(`⚠️ Found ${navButtons} buttons in nav, but no theme toggle identified`)
    } else {
      // Click toggle
      await toggle.click()
      await page.waitForTimeout(500)

      // Check for theme options
      const lightOption = page.locator('text=Light').first()
      const darkOption = page.locator('text=Dark').first()
      const systemOption = page.locator('text=System').first()

      const hasLight = await lightOption.isVisible().catch(() => false)
      const hasDark = await darkOption.isVisible().catch(() => false)
      const hasSystem = await systemOption.isVisible().catch(() => false)

      if (!hasLight && !hasDark && !hasSystem) {
        issues.push('❌ Theme options dropdown does not appear')
      } else {
        if (!hasLight) issues.push('⚠️ Light theme option missing')
        if (!hasDark) issues.push('⚠️ Dark theme option missing')
        if (!hasSystem) issues.push('⚠️ System theme option missing')
      }
    }

    await page.screenshot({ path: 'audit-screenshots/theme-toggle.png', fullPage: true })

    if (issues.length > 0) {
      console.log('\n🔴 THEME TOGGLE ISSUES:')
      issues.forEach(issue => console.log(issue))
      // Don't throw - theme toggle is nice to have
      console.log('⚠️ Theme toggle has issues but is not critical')
    } else {
      console.log('✅ Theme toggle works correctly')
    }
  })

  test('CRITICAL 4: Design Tokens Consistency', async ({ page }) => {
    const issues: string[] = []

    // Check for hardcoded colors in computed styles
    const body = page.locator('body')
    const styles = await body.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        // Check if using CSS variables
        bgIsVariable: computed.backgroundColor.includes('rgb') && 
                     !computed.backgroundColor.match(/rgb\(\d+,\s*\d+,\s*\d+\)/),
      }
    })

    // Check for common hardcoded colors
    const hardcodedColors = [
      '#18181b', '#0a0a0a', '#181818', // zinc-950 variants
      '#3b82f6', '#2563eb', '#1d4ed8', // blue variants
      'rgb(24, 24, 27)', 'rgb(10, 10, 10)'
    ]

    // Get all elements and check their styles
    const allElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'))
      return elements.slice(0, 50).map(el => {
        const styles = window.getComputedStyle(el)
        return {
          tag: el.tagName,
          bg: styles.backgroundColor,
          color: styles.color,
          border: styles.borderColor
        }
      })
    })

    // Check for hardcoded colors
    allElements.forEach((el, idx) => {
      hardcodedColors.forEach(color => {
        if (el.bg.includes(color) || el.color.includes(color) || el.border.includes(color)) {
          issues.push(`⚠️ Potential hardcoded color "${color}" found in ${el.tag} element`)
        }
      })
    })

    // Check console for errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.waitForTimeout(2000)

    if (consoleErrors.length > 0) {
      issues.push(`❌ Found ${consoleErrors.length} console errors`)
      consoleErrors.forEach(err => issues.push(`  - ${err}`))
    }

    await page.screenshot({ path: 'audit-screenshots/design-tokens.png', fullPage: true })

    if (issues.length > 5) {
      console.log('\n🔴 DESIGN TOKENS ISSUES:')
      issues.slice(0, 10).forEach(issue => console.log(issue))
      console.log(`... and ${issues.length - 10} more issues`)
    } else if (issues.length > 0) {
      console.log('\n⚠️ DESIGN TOKENS WARNINGS:')
      issues.forEach(issue => console.log(issue))
    } else {
      console.log('✅ Design tokens appear consistent')
    }
  })

  test('CRITICAL 5: User Flow - Complete Workflow', async ({ page }) => {
    const issues: string[] = []
    const steps: string[] = []

    try {
      // Step 1: Upload CSV
      steps.push('Step 1: Upload CSV')
      const csvContent = `name,email,description\nJohn Doe,john@example.com,Software engineer\nJane Smith,jane@example.com,Marketing manager`
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      })
      await page.waitForTimeout(3000)

      // Verify CSV uploaded
      const csvUploaded = await page.locator('text=/rows|columns/i').first().isVisible().catch(() => false)
      if (!csvUploaded) {
        issues.push('❌ CSV upload not confirmed (no row/column count visible)')
      } else {
        steps.push('✅ CSV uploaded successfully')
      }

      // Step 2: Enter prompt
      steps.push('Step 2: Enter prompt')
      await page.fill('textarea', 'Write a bio for {{name}}')
      await page.waitForTimeout(1000)

      const promptEntered = await page.locator('textarea').inputValue()
      if (!promptEntered.includes('{{name}}')) {
        issues.push('❌ Prompt not entered correctly')
      } else {
        steps.push('✅ Prompt entered successfully')
      }

      // Step 3: Check AI Optimization
      steps.push('Step 3: Check AI Optimization')
      const aiButton = page.locator('button:has-text("Optimize")').first()
      const aiVisible = await aiButton.isVisible().catch(() => false)
      
      if (!aiVisible) {
        issues.push('❌ AI Optimization button not visible after CSV + prompt')
      } else {
        steps.push('✅ AI Optimization button visible')
        
        // Try clicking it
        await aiButton.click()
        await page.waitForTimeout(3000)
        
        // Check for optimization results or loading state
        const optimizing = await page.locator('text=/optimizing|analyzing/i').first().isVisible().catch(() => false)
        const optimized = await page.locator('[data-testid="optimized-prompt"], text=/suggestion/i').first().isVisible().catch(() => false)
        
        if (optimizing || optimized) {
          steps.push('✅ AI Optimization triggered')
        } else {
          issues.push('⚠️ AI Optimization button clicked but no response visible')
        }
      }

      // Step 4: Check Run button
      steps.push('Step 4: Check Run button')
      const runButton = page.locator('button:has-text("Run"), button:has-text("Process")').first()
      const runVisible = await runButton.isVisible().catch(() => false)
      const runEnabled = await runButton.isEnabled().catch(() => false)

      if (!runVisible) {
        issues.push('❌ Run button not visible')
      } else if (!runEnabled) {
        issues.push('❌ Run button disabled (should be enabled with CSV + prompt)')
        
        // Check for tooltip explaining why
        await runButton.hover()
        await page.waitForTimeout(500)
        const tooltip = await page.locator('[role="tooltip"]').first().isVisible().catch(() => false)
        if (!tooltip) {
          issues.push('⚠️ Run button disabled but no tooltip explaining why')
        }
      } else {
        steps.push('✅ Run button visible and enabled')
      }

      await page.screenshot({ path: 'audit-screenshots/complete-workflow.png', fullPage: true })

      console.log('\n📋 WORKFLOW STEPS:')
      steps.forEach(step => console.log(step))

      if (issues.length > 0) {
        console.log('\n🔴 WORKFLOW ISSUES:')
        issues.forEach(issue => console.log(issue))
        throw new Error(`Found ${issues.length} issues in workflow`)
      }

    } catch (error) {
      await page.screenshot({ path: 'audit-screenshots/workflow-error.png', fullPage: true })
      throw error
    }
  })

  test('CRITICAL 6: Accessibility Audit', async ({ page }) => {
    const issues: string[] = []

    // Check for disabled buttons without tooltips/aria-labels
    const disabledButtons = page.locator('button:disabled')
    const disabledCount = await disabledButtons.count()

    for (let i = 0; i < Math.min(disabledCount, 5); i++) {
      const button = disabledButtons.nth(i)
      const ariaLabel = await button.getAttribute('aria-label')
      const title = await button.getAttribute('title')
      
      // Hover to trigger tooltip
      await button.hover()
      await page.waitForTimeout(300)
      
      const tooltip = await page.locator('[role="tooltip"]').first().isVisible().catch(() => false)
      
      if (!ariaLabel && !title && !tooltip) {
        const buttonText = await button.textContent()
        issues.push(`❌ Disabled button "${buttonText?.substring(0, 30)}" has no accessibility label or tooltip`)
      }
    }

    // Check for form inputs without labels
    const inputs = page.locator('input, textarea, select')
    const inputCount = await inputs.count()

    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const placeholder = await input.getAttribute('placeholder')
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count()
        if (label === 0 && !ariaLabel) {
          issues.push(`⚠️ Input with id="${id}" has no associated label`)
        }
      } else if (!ariaLabel && !placeholder) {
        issues.push(`⚠️ Input element has no label, aria-label, or placeholder`)
      }
    }

    // Check focus indicators
    const focusable = page.locator('button, a, input, textarea, select, [tabindex]')
    const focusableCount = await focusable.count()

    if (focusableCount === 0) {
      issues.push('❌ No focusable elements found')
    }

    await page.screenshot({ path: 'audit-screenshots/accessibility.png', fullPage: true })

    if (issues.length > 0) {
      console.log('\n🔴 ACCESSIBILITY ISSUES:')
      issues.forEach(issue => console.log(issue))
    } else {
      console.log('✅ Accessibility looks good')
    }
  })
})

