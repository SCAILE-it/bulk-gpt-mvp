// 🧪 Wizard 110% Quality Automated Test
// Based on MANUAL_TEST_PLAN.md
// Tests wizard at http://localhost:5004

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('\n🎯 Wizard 110% Quality Test');
  console.log('============================\n');
  console.log('Testing: http://localhost:5004/wizard');
  console.log('CSV file: test-data.csv\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300  // Slow down for visual verification
  });

  const page = await browser.newPage();

  // Create screenshots directory
  const fs = require('fs');
  if (!fs.existsSync('screenshots-wizard')) {
    fs.mkdirSync('screenshots-wizard');
  }

  try {
    // ===== TEST 1: Authentication Redirect =====
    console.log('TEST 1: Authentication redirect');
    await page.goto('http://localhost:5004/wizard');
    await page.waitForTimeout(1500);

    if (page.url().includes('/auth')) {
      console.log('  ✅ PASS: Redirected to /auth\n');
      results.passed.push('Auth redirect');
    } else {
      console.log('  ❌ FAIL: Did not redirect to /auth\n');
      results.failed.push('Auth redirect');
    }

    // ===== TEST 2: Sign In =====
    console.log('TEST 2: Sign in functionality');
    try {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      if (page.url().includes('/wizard')) {
        console.log('  ✅ PASS: Signed in and redirected to wizard\n');
        results.passed.push('Sign in');
      } else {
        console.log('  ❌ FAIL: Sign in failed, URL:', page.url(), '\n');
        results.failed.push('Sign in');
      }
    } catch (error) {
      console.log('  ❌ FAIL: Sign in error:', error.message, '\n');
      results.failed.push('Sign in - ' + error.message);
    }

    // ===== TEST 3: Step 1 - Upload UI Elements =====
    console.log('TEST 3: Step 1 - Upload UI elements');
    try {
      // Check for upload heading
      const uploadHeading = page.locator('text=Upload CSV File').first();
      const headingVisible = await uploadHeading.isVisible({ timeout: 3000 }).catch(() => false);

      if (headingVisible) {
        console.log('  ✅ Upload heading visible');
        results.passed.push('Upload heading');
      } else {
        console.log('  ❌ Upload heading not found');
        results.failed.push('Upload heading');
      }

      // Check for dropzone text
      const dropzoneText = await page.locator('text=/Drop file here|click to browse/i').first().isVisible().catch(() => false);
      if (dropzoneText) {
        console.log('  ✅ Dropzone instructions visible');
        results.passed.push('Dropzone text');
      } else {
        console.log('  ⚠️  Dropzone instructions not clear');
        results.warnings.push('Dropzone text');
      }

      // Check for file size limit
      const sizeLimit = await page.locator('text=/50MB|10,000 rows/i').first().isVisible().catch(() => false);
      if (sizeLimit) {
        console.log('  ✅ File size limit displayed');
        results.passed.push('File size limit');
      } else {
        console.log('  ⚠️  File size limit not displayed');
        results.warnings.push('File size limit');
      }

      console.log('');
    } catch (error) {
      console.log('  ❌ FAIL: Step 1 UI error:', error.message, '\n');
      results.failed.push('Step 1 UI - ' + error.message);
    }

    // Screenshot: Step 1 initial state
    await page.screenshot({
      path: 'screenshots-wizard/01-step1-initial.png',
      fullPage: true
    });
    console.log('📸 Screenshot: 01-step1-initial.png\n');

    // ===== TEST 4: CSV File Upload =====
    console.log('TEST 4: CSV file upload and preview');
    try {
      const fileInput = page.locator('input[type="file"]');
      const csvPath = path.join(__dirname, 'test-data.csv');

      await fileInput.setInputFiles(csvPath);
      console.log('  ⏳ Uploading test-data.csv...');
      await page.waitForTimeout(2000);

      // Check for success indicator (✓ filename)
      const fileSuccess = await page.locator('text=/✓|test-data.csv/i').first().isVisible().catch(() => false);
      if (fileSuccess) {
        console.log('  ✅ File uploaded successfully');
        results.passed.push('File upload');
      } else {
        console.log('  ❌ File upload indicator not found');
        results.failed.push('File upload');
      }

      // Check for row count display
      const rowCount = await page.locator('text=/rows/i').first().isVisible().catch(() => false);
      if (rowCount) {
        console.log('  ✅ Row count displayed');
        results.passed.push('Row count');
      } else {
        console.log('  ⚠️  Row count not displayed');
        results.warnings.push('Row count');
      }

      // Check for preview table
      const previewTable = await page.locator('table, text=Preview').first().isVisible().catch(() => false);
      if (previewTable) {
        console.log('  ✅ Preview table visible');
        results.passed.push('Preview table');
      } else {
        console.log('  ❌ Preview table not found');
        results.failed.push('Preview table');
      }

      // Check for action buttons
      const uploadDifferent = await page.locator('text=/Upload Different/i').first().isVisible().catch(() => false);
      const continueBtn = await page.locator('text=/Continue/i').first().isVisible().catch(() => false);

      if (uploadDifferent) {
        console.log('  ✅ "Upload Different" button visible');
        results.passed.push('Upload Different button');
      } else {
        console.log('  ⚠️  "Upload Different" button not found');
        results.warnings.push('Upload Different button');
      }

      if (continueBtn) {
        console.log('  ✅ "Continue →" button visible');
        results.passed.push('Continue button');
      } else {
        console.log('  ❌ "Continue →" button not found');
        results.failed.push('Continue button');
      }

      console.log('');
    } catch (error) {
      console.log('  ❌ FAIL: File upload error:', error.message, '\n');
      results.failed.push('File upload - ' + error.message);
    }

    // Screenshot: Step 1 after upload
    await page.screenshot({
      path: 'screenshots-wizard/02-step1-uploaded.png',
      fullPage: true
    });
    console.log('📸 Screenshot: 02-step1-uploaded.png\n');

    // ===== TEST 5: Navigate to Step 2 =====
    console.log('TEST 5: Navigate to Step 2');
    try {
      const continueBtn = page.locator('text=/Continue/i').first();
      await continueBtn.click();
      await page.waitForTimeout(1500);

      // Check if Step 2 is visible
      const step2Visible = await page.locator('text=/Write your prompt/i').first().isVisible().catch(() => false);
      if (step2Visible) {
        console.log('  ✅ PASS: Navigated to Step 2\n');
        results.passed.push('Step 2 navigation');
      } else {
        console.log('  ❌ FAIL: Step 2 not loaded\n');
        results.failed.push('Step 2 navigation');
      }
    } catch (error) {
      console.log('  ❌ FAIL: Navigation error:', error.message, '\n');
      results.failed.push('Step 2 navigation - ' + error.message);
    }

    // Screenshot: Step 2 initial state
    await page.screenshot({
      path: 'screenshots-wizard/03-step2-initial.png',
      fullPage: true
    });
    console.log('📸 Screenshot: 03-step2-initial.png\n');

    // ===== TEST 6: Step 2 UI Elements =====
    console.log('TEST 6: Step 2 - Configure UI elements');
    try {
      // CSV filename displayed
      const csvFilename = await page.locator('text=test-data.csv').first().isVisible().catch(() => false);
      if (csvFilename) {
        console.log('  ✅ CSV filename displayed');
        results.passed.push('CSV filename in Step 2');
      } else {
        console.log('  ⚠️  CSV filename not prominently displayed');
        results.warnings.push('CSV filename in Step 2');
      }

      // Prompt textarea
      const promptTextarea = await page.locator('textarea').first().isVisible().catch(() => false);
      if (promptTextarea) {
        console.log('  ✅ Prompt textarea visible');
        results.passed.push('Prompt textarea');
      } else {
        console.log('  ❌ Prompt textarea not found');
        results.failed.push('Prompt textarea');
      }

      // Column pills
      const columnPills = await page.locator('text=/Columns|name|company|role/i').first().isVisible().catch(() => false);
      if (columnPills) {
        console.log('  ✅ Column pills visible');
        results.passed.push('Column pills');
      } else {
        console.log('  ⚠️  Column pills not clear');
        results.warnings.push('Column pills');
      }

      // Processing mode selector
      const testMode = await page.locator('text=/Test.*rows/i').first().isVisible().catch(() => false);
      const fullMode = await page.locator('text=/Full.*rows/i').first().isVisible().catch(() => false);

      if (testMode && fullMode) {
        console.log('  ✅ Processing mode (Test/Full) visible');
        results.passed.push('Processing mode selector');
      } else {
        console.log('  ❌ Processing mode selector not found');
        results.failed.push('Processing mode selector');
      }

      // Advanced Options (should be collapsible)
      const advancedOptions = await page.locator('text=/Advanced Options/i').first().isVisible().catch(() => false);
      if (advancedOptions) {
        console.log('  ✅ Advanced Options section visible');
        results.passed.push('Advanced Options');
      } else {
        console.log('  ⚠️  Advanced Options not found');
        results.warnings.push('Advanced Options');
      }

      console.log('');
    } catch (error) {
      console.log('  ❌ FAIL: Step 2 UI error:', error.message, '\n');
      results.failed.push('Step 2 UI - ' + error.message);
    }

    // ===== TEST 7: Processing Mode Toggle =====
    console.log('TEST 7: Processing mode toggle');
    try {
      const fullModeBtn = page.locator('text=/Full.*rows/i').first();
      await fullModeBtn.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Clicked "Full" mode');

      const testModeBtn = page.locator('text=/Test.*rows/i').first();
      await testModeBtn.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Clicked "Test" mode\n');

      results.passed.push('Processing mode toggle');
    } catch (error) {
      console.log('  ⚠️  Processing mode toggle error:', error.message, '\n');
      results.warnings.push('Processing mode toggle');
    }

    // ===== TEST 8: Advanced Options Collapse/Expand =====
    console.log('TEST 8: Advanced Options collapse/expand');
    try {
      const advancedBtn = page.locator('text=/Advanced Options/i').first();
      await advancedBtn.click();
      await page.waitForTimeout(800);
      console.log('  ✅ Clicked to expand Advanced Options');

      // Check if Context and Output Columns visible
      const contextVisible = await page.locator('text=/Context.*optional/i').first().isVisible({ timeout: 2000 }).catch(() => false);
      const outputColumnsVisible = await page.locator('text=/Output Columns/i').first().isVisible({ timeout: 2000 }).catch(() => false);

      if (contextVisible) {
        console.log('  ✅ Context textarea visible');
        results.passed.push('Context field');
      } else {
        console.log('  ⚠️  Context field not found');
        results.warnings.push('Context field');
      }

      if (outputColumnsVisible) {
        console.log('  ✅ Output Columns visible');
        results.passed.push('Output Columns');
      } else {
        console.log('  ⚠️  Output Columns not found');
        results.warnings.push('Output Columns');
      }

      console.log('');
    } catch (error) {
      console.log('  ⚠️  Advanced Options expand error:', error.message, '\n');
      results.warnings.push('Advanced Options expand');
    }

    // Screenshot: Step 2 with Advanced expanded
    await page.screenshot({
      path: 'screenshots-wizard/04-step2-advanced-expanded.png',
      fullPage: true
    });
    console.log('📸 Screenshot: 04-step2-advanced-expanded.png\n');

    // ===== TEST 9: Prompt Entry =====
    console.log('TEST 9: Prompt entry');
    try {
      const promptTextarea = page.locator('textarea').first();
      const testPrompt = 'Write a professional bio for {{name}} who works as a {{role}} at {{company}} in the {{industry}} industry.';

      await promptTextarea.fill(testPrompt);
      await page.waitForTimeout(500);

      const value = await promptTextarea.inputValue();
      if (value === testPrompt) {
        console.log('  ✅ Prompt entered successfully');
        results.passed.push('Prompt entry');
      } else {
        console.log('  ⚠️  Prompt value mismatch');
        results.warnings.push('Prompt entry');
      }

      console.log('');
    } catch (error) {
      console.log('  ❌ FAIL: Prompt entry error:', error.message, '\n');
      results.failed.push('Prompt entry - ' + error.message);
    }

    // Screenshot: Step 2 with prompt filled
    await page.screenshot({
      path: 'screenshots-wizard/05-step2-prompt-filled.png',
      fullPage: true
    });
    console.log('📸 Screenshot: 05-step2-prompt-filled.png\n');

    // ===== TEST 10: Validation (Try submitting without requirements) =====
    console.log('TEST 10: Form validation');
    try {
      // Clear prompt
      const promptTextarea = page.locator('textarea').first();
      await promptTextarea.fill('');
      await page.waitForTimeout(300);

      // Try to submit
      const startBtn = page.locator('text=/Start Processing/i').first();
      await startBtn.click();
      await page.waitForTimeout(1000);

      // Check for error message
      const errorVisible = await page.locator('text=/required|must contain/i').first().isVisible().catch(() => false);
      if (errorVisible) {
        console.log('  ✅ Validation error shown for empty prompt');
        results.passed.push('Validation - empty prompt');
      } else {
        console.log('  ⚠️  Validation error not shown or not clear');
        results.warnings.push('Validation - empty prompt');
      }

      console.log('');
    } catch (error) {
      console.log('  ⚠️  Validation test error:', error.message, '\n');
      results.warnings.push('Validation test');
    }

    // ===== FINAL SUMMARY =====
    console.log('\n═══════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════\n');

    console.log(`✅ PASSED: ${results.passed.length} tests`);
    console.log(`❌ FAILED: ${results.failed.length} tests`);
    console.log(`⚠️  WARNINGS: ${results.warnings.length} issues\n`);

    if (results.passed.length > 0) {
      console.log('✅ Passed Tests:');
      results.passed.forEach(t => console.log(`   • ${t}`));
      console.log('');
    }

    if (results.failed.length > 0) {
      console.log('❌ Failed Tests (CRITICAL):');
      results.failed.forEach(t => console.log(`   • ${t}`));
      console.log('');
    }

    if (results.warnings.length > 0) {
      console.log('⚠️  Warnings (UI/UX Polish Needed):');
      results.warnings.forEach(t => console.log(`   • ${t}`));
      console.log('');
    }

    // Overall assessment
    const passRate = (results.passed.length / (results.passed.length + results.failed.length + results.warnings.length)) * 100;
    console.log('═══════════════════════════════════');
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);

    if (results.failed.length === 0 && results.warnings.length === 0) {
      console.log('✅ Status: READY FOR 110% POLISH');
    } else if (results.failed.length === 0) {
      console.log('⚠️  Status: NEEDS UI/UX POLISH');
    } else {
      console.log('❌ Status: NEEDS BUG FIXES FIRST');
    }

    console.log('═══════════════════════════════════\n');

    console.log('📸 Screenshots saved in: screenshots-wizard/');
    console.log('🖱️  Browser will stay open for 30 seconds for manual inspection...\n');

    // Keep browser open briefly
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('✅ Browser closed.\n');
  }
})();
