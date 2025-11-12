const { chromium } = require('playwright')

/**
 * CRITICAL AUDIT SCRIPT
 * Runs comprehensive audit of production deployment
 */

async function runCriticalAudit() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  const issues = []
  const warnings = []
  const successes = []

  try {
    console.log('\n🔍 STARTING CRITICAL AUDIT...\n')
    
    // Navigate and login
    console.log('1. Navigating to app...')
    await page.goto('https://bulk-gpt-app.vercel.app/')
    await page.waitForLoadState('networkidle')
    
    console.log('2. Logging in...')
    await page.fill('input[type="email"]', 'test@bulkgpt.local')
    await page.fill('input[type="password"]', 'Test123456!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/bulk', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    
    await page.screenshot({ path: 'audit-screenshots/01-after-login.png', fullPage: true })
    console.log('✅ Logged in successfully\n')

    // Dismiss onboarding if present
    const skipButton = page.locator('button:has-text("Skip")').first()
    const nextButton = page.locator('button:has-text("Next")').first()
    const getStartedButton = page.locator('button:has-text("Get Started")').first()
    
    if (await skipButton.isVisible().catch(() => false)) {
      console.log('  - Dismissing onboarding...')
      await skipButton.click()
      await page.waitForTimeout(1000)
    } else if (await getStartedButton.isVisible().catch(() => false)) {
      await getStartedButton.click()
      await page.waitForTimeout(1000)
    }

    // Debug: Check page structure
    const pageStructure = await page.evaluate(() => {
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'))
      const buttons = Array.from(document.querySelectorAll('button')).slice(0, 20).map(b => ({
        text: b.textContent?.substring(0, 50),
        ariaExpanded: b.getAttribute('aria-expanded'),
        className: b.className.substring(0, 50)
      }))
      return {
        fileInputs: fileInputs.length,
        fileInputIds: fileInputs.map(i => ({ id: i.id, name: i.name, hidden: i.hidden })),
        buttons: buttons
      }
    })
    console.log('Page structure:', JSON.stringify(pageStructure, null, 2))

    // AUDIT 1: Sequential Section Expansion
    console.log('\n📋 AUDIT 1: Sequential Section Expansion')
    
    // Find sections by text content
    const allButtons = await page.locator('button').all()
    let dataInputButton = null
    let promptButton = null
    let outputSettingsButton = null
    
    for (const btn of allButtons) {
      const text = await btn.textContent()
      if (text?.includes('Data Input')) dataInputButton = btn
      if (text?.includes('Prompt')) promptButton = btn
      if (text?.includes('Output Settings')) outputSettingsButton = btn
    }

    if (!dataInputButton) {
      issues.push('❌ Data Input section button not found')
    }
    if (!promptButton) {
      issues.push('❌ Prompt section button not found')
    }
    if (!outputSettingsButton) {
      issues.push('❌ Output Settings section button not found')
    }

    // Check initial state
    if (dataInputButton) {
      const initialDataExpanded = await dataInputButton.getAttribute('aria-expanded')
      if (initialDataExpanded === 'true') issues.push('❌ Data Input starts expanded (should be collapsed)')
    }
    if (promptButton) {
      const initialPromptExpanded = await promptButton.getAttribute('aria-expanded')
      if (initialPromptExpanded === 'true') issues.push('❌ Prompt starts expanded (should be collapsed)')
    }
    if (outputSettingsButton) {
      const initialOutputExpanded = await outputSettingsButton.getAttribute('aria-expanded')
      if (initialOutputExpanded === 'true') issues.push('❌ Output Settings starts expanded (should be collapsed)')
    }

    // Upload CSV - use evaluate to find hidden input
    console.log('  - Uploading CSV...')
    const csvContent = `name,email,description\nJohn Doe,john@example.com,Software engineer\nJane Smith,jane@example.com,Marketing manager`
    
    // Wait a bit for page to fully load
    await page.waitForTimeout(1000)
    
    const fileUploaded = await page.evaluate(async (csvContent) => {
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
    
    if (!fileUploaded.success) {
      issues.push(`❌ CSV upload failed: ${fileUploaded.error}`)
    } else {
      await page.waitForTimeout(3000)
    }

    // Re-find buttons after CSV upload (DOM may have changed)
    const allButtonsAfterCSV = await page.locator('button').all()
    let dataInputButtonAfter = null
    let promptButtonAfter = null
    let outputSettingsButtonAfter = null
    
    for (const btn of allButtonsAfterCSV) {
      const text = await btn.textContent()
      if (text?.includes('Data Input')) dataInputButtonAfter = btn
      if (text?.includes('Prompt')) promptButtonAfter = btn
      if (text?.includes('Output Settings')) outputSettingsButtonAfter = btn
    }

    const afterCSVDataExpanded = dataInputButtonAfter ? await dataInputButtonAfter.getAttribute('aria-expanded') : null
    const afterCSVPromptExpanded = promptButtonAfter ? await promptButtonAfter.getAttribute('aria-expanded') : null
    const afterCSVOutputExpanded = outputSettingsButtonAfter ? await outputSettingsButtonAfter.getAttribute('aria-expanded') : null

    if (afterCSVDataExpanded !== 'true') {
      issues.push('❌ Data Input did NOT expand after CSV upload')
    } else {
      successes.push('✅ Data Input expanded after CSV upload')
    }
    if (afterCSVPromptExpanded === 'true') {
      issues.push('❌ Prompt expanded when it should stay collapsed')
    }
    if (afterCSVOutputExpanded === 'true') {
      issues.push('❌ Output Settings expanded when it should stay collapsed')
    }

    await page.screenshot({ path: 'audit-screenshots/02-after-csv.png', fullPage: true })

    // Enter prompt
    console.log('  - Entering prompt...')
    const textarea = page.locator('textarea').first()
    const textareaVisible = await textarea.isVisible().catch(() => false)
    
    if (!textareaVisible) {
      // Try expanding Prompt section first
      if (promptButtonAfter) {
        await promptButtonAfter.click()
        await page.waitForTimeout(500)
      }
    }
    
    await textarea.fill('Write a bio for {{name}}')
    await page.waitForTimeout(2000)

    // Re-find buttons after prompt
    const allButtonsAfterPrompt = await page.locator('button').all()
    let dataInputButtonFinal = null
    let promptButtonFinal = null
    let outputSettingsButtonFinal = null
    
    for (const btn of allButtonsAfterPrompt) {
      const text = await btn.textContent()
      if (text?.includes('Data Input')) dataInputButtonFinal = btn
      if (text?.includes('Prompt')) promptButtonFinal = btn
      if (text?.includes('Output Settings')) outputSettingsButtonFinal = btn
    }

    const afterPromptDataExpanded = dataInputButtonFinal ? await dataInputButtonFinal.getAttribute('aria-expanded') : null
    const afterPromptPromptExpanded = promptButtonFinal ? await promptButtonFinal.getAttribute('aria-expanded') : null
    const afterPromptOutputExpanded = outputSettingsButtonFinal ? await outputSettingsButtonFinal.getAttribute('aria-expanded') : null

    if (afterPromptPromptExpanded !== 'true') {
      issues.push('❌ Prompt did NOT expand after entering prompt')
    } else {
      successes.push('✅ Prompt expanded after entering prompt')
    }
    if (afterPromptOutputExpanded === 'true') {
      issues.push('❌ Output Settings expanded automatically (should only expand manually)')
    }

    await page.screenshot({ path: 'audit-screenshots/03-after-prompt.png', fullPage: true })

    // AUDIT 2: AI Optimization Button
    console.log('\n📋 AUDIT 2: AI Optimization Button Visibility')
    const aiSection = page.locator('text=AI Optimization').first()
    const aiSectionVisible = await aiSection.isVisible().catch(() => false)

    if (!aiSectionVisible) {
      issues.push('❌ AI Optimization section NOT visible')
      
      // Check if button exists elsewhere
      const optimizeButtonAnywhere = await page.locator('button:has-text("Optimize")').count()
      if (optimizeButtonAnywhere > 0) {
        warnings.push(`⚠️ Found ${optimizeButtonAnywhere} "Optimize" buttons but AI Optimization section not visible`)
      }
    } else {
      successes.push('✅ AI Optimization section visible')
    }

    const optimizeButton = page.locator('button:has-text("Optimize with AI"), button:has-text("Optimize")').first()
    const buttonVisible = await optimizeButton.isVisible().catch(() => false)
    const buttonEnabled = await optimizeButton.isEnabled().catch(() => false)

    if (!buttonVisible) {
      issues.push('❌ "Optimize with AI" button NOT visible')
    } else {
      successes.push('✅ "Optimize with AI" button visible')
    }
    if (!buttonEnabled) {
      issues.push('❌ "Optimize with AI" button disabled (should be enabled)')
    } else {
      successes.push('✅ "Optimize with AI" button enabled')
    }

    // AUDIT 3: Theme Toggle
    console.log('\n📋 AUDIT 3: Theme Toggle')
    const themeToggle = page.locator('button').filter({ 
      has: page.locator('svg')
    }).filter({
      hasText: /light|dark|theme/i
    }).first()

    const toggleVisible = await themeToggle.isVisible().catch(() => false)
    if (!toggleVisible) {
      warnings.push('⚠️ Theme toggle not found (may be in dropdown)')
    } else {
      successes.push('✅ Theme toggle visible')
    }

    // AUDIT 4: Console Errors
    console.log('\n📋 AUDIT 4: Console Errors')
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    await page.waitForTimeout(2000)

    if (consoleErrors.length > 0) {
      issues.push(`❌ Found ${consoleErrors.length} console errors`)
      consoleErrors.slice(0, 5).forEach(err => warnings.push(`  - ${err}`))
    } else {
      successes.push('✅ No console errors')
    }

    // AUDIT 5: Run Button State
    console.log('\n📋 AUDIT 5: Run Button State')
    const runButton = page.locator('button:has-text("Run"), button:has-text("Process")').first()
    const runVisible = await runButton.isVisible().catch(() => false)
    const runEnabled = await runButton.isEnabled().catch(() => false)

    if (!runVisible) {
      issues.push('❌ Run button NOT visible')
    } else {
      successes.push('✅ Run button visible')
    }
    if (!runEnabled) {
      issues.push('❌ Run button disabled (should be enabled with CSV + prompt)')
      
      // Check for tooltip
      await runButton.hover()
      await page.waitForTimeout(500)
      const tooltip = await page.locator('[role="tooltip"]').first().isVisible().catch(() => false)
      if (!tooltip) {
        warnings.push('⚠️ Run button disabled but no tooltip explaining why')
      }
    } else {
      successes.push('✅ Run button enabled')
    }

    await page.screenshot({ path: 'audit-screenshots/04-final-state.png', fullPage: true })

    // Print Results
    console.log('\n' + '='.repeat(60))
    console.log('📊 AUDIT RESULTS')
    console.log('='.repeat(60))
    
    if (successes.length > 0) {
      console.log('\n✅ SUCCESSES:')
      successes.forEach(s => console.log(`  ${s}`))
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:')
      warnings.forEach(w => console.log(`  ${w}`))
    }

    if (issues.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:')
      issues.forEach(i => console.log(`  ${i}`))
    }

    console.log('\n' + '='.repeat(60))
    console.log(`Total: ${successes.length} ✅ | ${warnings.length} ⚠️ | ${issues.length} ❌`)
    console.log('='.repeat(60) + '\n')

    if (issues.length > 0) {
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ AUDIT FAILED:', error.message)
    await page.screenshot({ path: 'audit-screenshots/error.png', fullPage: true })
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runCriticalAudit()

