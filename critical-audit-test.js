const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const issues = [];
  const screenshots = [];
  
  try {
    console.log('🔍 CRITICAL DEEP AUDIT & TEST\n');
    console.log('='.repeat(60));
    
    const screenshotDir = path.join(__dirname, 'critical-audit-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // ============================================================
    // TEST 1: FIRST IMPRESSION (Ultra overwhelming?)
    // ============================================================
    console.log('\n1️⃣  FIRST IMPRESSION TEST');
    console.log('-'.repeat(60));
    
    await page.goto('https://bulk-gpt-app.vercel.app', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, '01-first-impression.png'), fullPage: true });
    
    // Count visible elements
    const allText = await page.textContent('body');
    const wordCount = allText.split(/\s+/).length;
    const visibleButtons = await page.locator('button').all();
    const visibleInputs = await page.locator('input, textarea').all();
    const visibleSections = await page.locator('section, [class*="section"], [class*="card"]').all();
    
    console.log(`   Text elements: ${wordCount} words`);
    console.log(`   Buttons: ${visibleButtons.length}`);
    console.log(`   Inputs: ${visibleInputs.length}`);
    console.log(`   Sections/Cards: ${visibleSections.length}`);
    
    if (wordCount > 500) {
      issues.push('⚠️  FIRST IMPRESSION: Too much text on initial page (>500 words)');
    }
    if (visibleSections.length > 5) {
      issues.push('⚠️  FIRST IMPRESSION: Too many sections visible (>5)');
    }
    
    // Check for onboarding
    const onboarding = await page.locator('text=/Welcome|Upload your CSV|Get Started|Describe what you want/').first();
    const hasOnboarding = await onboarding.isVisible().catch(() => false);
    console.log(`   Onboarding visible: ${hasOnboarding}`);
    
    if (!hasOnboarding) {
      // Check if it's in localStorage
      const localStorage = await page.evaluate(() => {
        return localStorage.getItem('bulk-gpt-onboarding-seen');
      });
      if (localStorage === 'true') {
        console.log('   ⚠️  Onboarding dismissed (localStorage) - but is it clear what to do?');
        // Check if there's clear guidance without onboarding
        const guidance = await page.locator('text=/Upload|CSV|prompt|describe/').all();
        if (guidance.length < 2) {
          issues.push('❌ FIRST IMPRESSION: No onboarding AND no clear guidance on what to do');
        }
      }
    }
    
    // ============================================================
    // TEST 2: SECOND IMPRESSION (Too many explanations?)
    // ============================================================
    console.log('\n2️⃣  SECOND IMPRESSION TEST (After login)');
    console.log('-'.repeat(60));
    
    // Login
    await page.fill('input[type="email"]', 'test@bulkgpt.local');
    await page.fill('input[type="password"]', 'Test123456!');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(3000);
    
    // Navigate to bulk processor
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, '02-second-impression.png'), fullPage: true });
    
    // Count explanations, tips, help text
    const tips = await page.locator('text=/Tip|💡|FYI|Note|Hint|Help|💭/').all();
    const explanations = await page.locator('text=/explain|Explanation|Guide|Tutorial/').all();
    const infoBoxes = await page.locator('[class*="info"], [class*="hint"], [class*="tip"], [class*="help"]').all();
    
    console.log(`   Tips/Help text: ${tips.length}`);
    console.log(`   Explanations: ${explanations.length}`);
    console.log(`   Info boxes: ${infoBoxes.length}`);
    
    if (tips.length + explanations.length > 3) {
      issues.push('⚠️  SECOND IMPRESSION: Too many tips/explanations visible (>3)');
    }
    
    // ============================================================
    // TEST 3: Debug Logger
    // ============================================================
    console.log('\n3️⃣  DEBUG LOGGER TEST');
    console.log('-'.repeat(60));
    
    const debugLogger = await page.locator('[class*="debug"], [class*="Debug"], [class*="logger"]').first();
    const debugVisible = await debugLogger.isVisible().catch(() => false);
    console.log(`   Debug Logger visible: ${debugVisible}`);
    
    if (debugVisible) {
      const debugText = await debugLogger.textContent().catch(() => '');
      if (!debugText || debugText.trim().length === 0) {
        issues.push('❌ DEBUG LOGGER: Visible but empty - should be hidden');
      } else {
        issues.push('⚠️  DEBUG LOGGER: Visible in production - should only show in dev');
      }
    } else {
      console.log('   ✅ Debug Logger hidden correctly');
    }
    
    // ============================================================
    // TEST 4: Run Button Visibility
    // ============================================================
    console.log('\n4️⃣  RUN BUTTON VISIBILITY TEST');
    console.log('-'.repeat(60));
    
    // Check before CSV upload
    const runButtonBefore = page.locator('button:has-text("Run"), button:has-text("Run All")').first();
    const runVisibleBefore = await runButtonBefore.isVisible().catch(() => false);
    console.log(`   Run button visible (before CSV): ${runVisibleBefore}`);
    
    // Upload CSV
    const csvContent = `name,email,description
John Doe,john@example.com,Software engineer
Jane Smith,jane@example.com,Marketing manager`;
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, '03-after-csv-upload.png'), fullPage: true });
    
    // Enter prompt
    await page.fill('textarea', 'Write a bio for {{name}}');
    await page.waitForTimeout(2000);
    
    // Check Run button after CSV + prompt
    const runButtonAfter = page.locator('button:has-text("Run"), button:has-text("Run All")').first();
    const runVisibleAfter = await runButtonAfter.isVisible().catch(() => false);
    const runDisabled = runVisibleAfter ? await runButtonAfter.isDisabled() : true;
    const runText = runVisibleAfter ? await runButtonAfter.textContent() : '';
    
    console.log(`   Run button visible (after CSV+prompt): ${runVisibleAfter}`);
    console.log(`   Run button disabled: ${runDisabled}`);
    console.log(`   Run button text: "${runText?.trim()}"`);
    
    if (!runVisibleAfter) {
      issues.push('❌ RUN BUTTON: Not visible after CSV upload and prompt entry');
    } else if (runDisabled) {
      // Check why it's disabled
      const errorMessages = await page.locator('[class*="error"], [class*="red"]').all();
      let errorText = '';
      for (const err of errorMessages) {
        const text = await err.textContent().catch(() => '');
        if (text) errorText += text + ' ';
      }
      if (errorText) {
        console.log(`   Disabled reason: ${errorText.substring(0, 100)}...`);
        issues.push(`⚠️  RUN BUTTON: Disabled - ${errorText.substring(0, 50)}...`);
      } else {
        issues.push('⚠️  RUN BUTTON: Disabled but no clear reason shown');
      }
    }
    
    // ============================================================
    // TEST 5: Test Mode with Limit
    // ============================================================
    console.log('\n5️⃣  TEST MODE WITH LIMIT TEST');
    console.log('-'.repeat(60));
    
    const testButton = page.locator('button:has-text("Test")').first();
    const testVisible = await testButton.isVisible().catch(() => false);
    const testDisabled = testVisible ? await testButton.isDisabled() : false;
    
    console.log(`   Test button visible: ${testVisible}`);
    console.log(`   Test button disabled: ${testDisabled}`);
    
    if (testVisible && !testDisabled) {
      await testButton.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(screenshotDir, '04-test-mode-result.png'), fullPage: true });
      
      // Check for limit errors
      const limitErrors = await page.locator('text=/limit|Limit|reached|Reached|429/').all();
      if (limitErrors.length > 0) {
        const errorText = await limitErrors[0].textContent();
        console.log(`   Limit error found: ${errorText?.substring(0, 100)}...`);
        
        // Check if error message is helpful
        const hasResetTime = errorText?.includes('reset') || errorText?.includes('Reset');
        const hasSuggestion = errorText?.includes('Test') || errorText?.includes('⌘T') || errorText?.includes('tip');
        
        if (!hasResetTime && !hasSuggestion) {
          issues.push('⚠️  LIMIT ERROR: Error message lacks reset time or suggestions');
        }
      } else {
        console.log('   ✅ Test mode worked (no limit errors)');
      }
    } else if (testDisabled) {
      issues.push('⚠️  TEST BUTTON: Disabled - should work even when limit reached');
    }
    
    // ============================================================
    // TEST 6: CSV Preview
    // ============================================================
    console.log('\n6️⃣  CSV PREVIEW TEST');
    console.log('-'.repeat(60));
    
    const csvPreview = await page.locator('table, [class*="preview"], [class*="Preview"]').first();
    const previewVisible = await csvPreview.isVisible().catch(() => false);
    console.log(`   CSV Preview visible: ${previewVisible}`);
    
    if (previewVisible) {
      const previewText = await csvPreview.textContent();
      const hasData = previewText && (previewText.includes('John') || previewText.includes('Jane') || previewText.includes('name'));
      const isEmpty = previewText && (previewText.includes('No data') || previewText.includes('empty') || previewText.includes('—'));
      
      console.log(`   Preview has data: ${hasData}`);
      console.log(`   Preview shows empty: ${isEmpty}`);
      
      if (!hasData && isEmpty) {
        issues.push('❌ CSV PREVIEW: Shows empty state even though CSV was uploaded');
      } else if (!hasData && !isEmpty) {
        issues.push('⚠️  CSV PREVIEW: Visible but data not clearly displayed');
      }
    } else {
      issues.push('⚠️  CSV PREVIEW: Not visible after CSV upload');
    }
    
    // ============================================================
    // TEST 7: Tools Section
    // ============================================================
    console.log('\n7️⃣  TOOLS SECTION TEST');
    console.log('-'.repeat(60));
    
    const toolsSection = await page.locator('[class*="tool"], [class*="Tool"], text=/AI Tools|Tools|Enrichment/').first();
    const toolsVisible = await toolsSection.isVisible().catch(() => false);
    console.log(`   Tools section visible: ${toolsVisible}`);
    
    if (toolsVisible) {
      const toolsCount = await page.locator('[class*="tool"], button, [role="button"]').all();
      console.log(`   Tool items visible: ${toolsCount.length}`);
      
      if (toolsCount.length > 5) {
        issues.push('⚠️  TOOLS: Too many tools visible by default (>5) - should be hidden');
      }
    } else {
      console.log('   ✅ Tools section hidden by default (good)');
    }
    
    // ============================================================
    // TEST 8: Onboarding Flow Quality
    // ============================================================
    console.log('\n8️⃣  ONBOARDING FLOW QUALITY TEST');
    console.log('-'.repeat(60));
    
    // Clear localStorage to see onboarding
    await page.evaluate(() => {
      localStorage.removeItem('bulk-gpt-onboarding-seen');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const onboardingAfterReload = await page.locator('text=/Welcome|Upload your CSV|Describe what you want|Get your enriched CSV/').first();
    const onboardingVisibleAfterReload = await onboardingAfterReload.isVisible().catch(() => false);
    console.log(`   Onboarding visible after localStorage clear: ${onboardingVisibleAfterReload}`);
    
    if (onboardingVisibleAfterReload) {
      const onboardingText = await onboardingAfterReload.textContent();
      const hasSteps = onboardingText && (
        onboardingText.includes('1') || onboardingText.includes('2') || onboardingText.includes('3') ||
        onboardingText.includes('Upload') || onboardingText.includes('Describe') || onboardingText.includes('Get')
      );
      
      console.log(`   Onboarding has clear steps: ${hasSteps}`);
      
      if (!hasSteps) {
        issues.push('⚠️  ONBOARDING: Does not clearly show the 3-step process');
      }
    } else {
      // Check if there's alternative guidance
      const guidance = await page.locator('text=/Upload.*CSV|CSV.*upload|Describe.*want|prompt/').all();
      if (guidance.length < 2) {
        issues.push('❌ ONBOARDING: Not shown AND no alternative guidance visible');
      }
    }
    
    // ============================================================
    // TEST 9: Overall Clarity
    // ============================================================
    console.log('\n9️⃣  OVERALL CLARITY TEST');
    console.log('-'.repeat(60));
    
    // Check if it's clear what the app does
    const valueProp = await page.locator('text=/transform|enrich|AI|GPT|bulk|process|CSV/').all();
    console.log(`   Value proposition mentions: ${valueProp.length}`);
    
    // Check workflow clarity
    const workflowSteps = await page.locator('text=/Upload|Describe|Receive|Download|Get/').all();
    console.log(`   Workflow steps mentioned: ${workflowSteps.length}`);
    
    if (valueProp.length < 2) {
      issues.push('⚠️  CLARITY: Value proposition not clear');
    }
    if (workflowSteps.length < 2) {
      issues.push('⚠️  CLARITY: Workflow not clearly explained');
    }
    
    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n🔟 CRITICAL AUDIT SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Issues Found: ${issues.length}`);
    if (issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No critical issues found!');
    }
    
    console.log(`\n📸 Screenshots: ${screenshotDir}`);
    console.log('\n✅ Critical audit complete!');
    
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: path.join(__dirname, 'critical-audit-screenshots', 'error.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
