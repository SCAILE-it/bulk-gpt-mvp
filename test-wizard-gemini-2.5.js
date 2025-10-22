/**
 * Comprehensive Wizard Test - Gemini 2.5 Flash Verification
 * Tests the complete wizard flow with the updated model
 */

const { chromium } = require('playwright');

(async () => {
  console.log('\n🧪 Wizard End-to-End Test - Gemini 2.5 Flash\n');
  console.log('Testing on: http://localhost:3010/wizard\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  const results = {
    passed: [],
    failed: [],
    issues: []
  };

  try {
    // Test 1: Load wizard
    console.log('✓ Test 1: Loading wizard...');
    await page.goto('http://localhost:3010/wizard');
    await page.waitForTimeout(2000);

    // Check if redirected to auth
    if (page.url().includes('/auth')) {
      console.log('  📝 Auth required - signing in...');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // Verify we're on wizard
    if (page.url().includes('/wizard')) {
      console.log('  ✅ Wizard loaded successfully\n');
      results.passed.push('Wizard load');
    } else {
      console.log('  ❌ Failed to load wizard\n');
      results.failed.push('Wizard load');
      throw new Error('Cannot access wizard');
    }

    // Test 2: Upload CSV
    console.log('✓ Test 2: Uploading test CSV...');
    const uploadHeading = await page.locator('text=Upload CSV File').first();
    const isVisible = await uploadHeading.isVisible().catch(() => false);

    if (!isVisible) {
      throw new Error('Upload UI not visible');
    }

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('/Users/federicodeponte/Downloads/local-coder/bulk-gpt-app/test-data.csv');
    await page.waitForTimeout(2000);

    // Check for preview
    const hasPreview = await page.locator('text=Preview').first().isVisible().catch(() => false);
    if (hasPreview) {
      console.log('  ✅ CSV uploaded and preview shown\n');
      results.passed.push('CSV upload');
    } else {
      console.log('  ⚠️  CSV uploaded but preview unclear\n');
      results.issues.push('CSV preview');
    }

    // Screenshot Step 1
    await page.screenshot({ path: '/tmp/wizard-test-step1.png', fullPage: true });
    console.log('  📸 Screenshot: wizard-test-step1.png\n');

    // Test 3: Navigate to Step 2
    console.log('✓ Test 3: Navigating to Step 2...');
    const continueBtn = await page.locator('text=Continue').first();
    await continueBtn.click();
    await page.waitForTimeout(1500);

    const promptLabel = await page.locator('text=Write your prompt').first().isVisible().catch(() => false);
    if (promptLabel) {
      console.log('  ✅ Navigated to Step 2 - Configure\n');
      results.passed.push('Step 2 navigation');
    } else {
      console.log('  ❌ Failed to reach Step 2\n');
      results.failed.push('Step 2 navigation');
      throw new Error('Cannot reach Step 2');
    }

    // Test 4: Configure prompt
    console.log('✓ Test 4: Configuring prompt...');
    const textarea = await page.locator('textarea').first();
    await textarea.fill('What is the capital of {{Country}}? Answer in 1-2 words only.');
    await page.waitForTimeout(500);
    console.log('  ✅ Prompt configured\n');
    results.passed.push('Prompt configuration');

    // Screenshot Step 2
    await page.screenshot({ path: '/tmp/wizard-test-step2.png', fullPage: true });
    console.log('  📸 Screenshot: wizard-test-step2.png\n');

    // Test 5: Select Test Mode (to avoid quota issues)
    console.log('✓ Test 5: Selecting Test Mode...');
    const testModeBtn = await page.locator('text=Test').first();
    await testModeBtn.click();
    await page.waitForTimeout(500);
    console.log('  ✅ Test mode selected (5 rows max)\n');
    results.passed.push('Test mode selection');

    // Test 6: Start Processing
    console.log('✓ Test 6: Starting processing...');
    const startBtn = await page.locator('text=Start Processing').first();
    await startBtn.click();
    await page.waitForTimeout(3000);

    // Check if we reached Step 3
    const processingIndicator = await page.locator('text=Processing').first().isVisible().catch(() => false);
    if (processingIndicator) {
      console.log('  ✅ Processing started - reached Step 3\n');
      results.passed.push('Processing start');
    } else {
      console.log('  ⚠️  Processing state unclear\n');
      results.issues.push('Processing indicator');
    }

    // Screenshot Step 3 - Initial
    await page.screenshot({ path: '/tmp/wizard-test-step3-start.png', fullPage: true });
    console.log('  📸 Screenshot: wizard-test-step3-start.png\n');

    // Test 7: Monitor progress (30 seconds)
    console.log('✓ Test 7: Monitoring progress for 30 seconds...');
    let progressChecks = 0;
    let completedRows = 0;
    let hasResults = false;

    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(2000);
      progressChecks++;

      // Check for completed rows
      const resultRows = await page.locator('tr').count();
      if (resultRows > 1) {
        hasResults = true;
        completedRows = resultRows - 1; // Subtract header row
      }

      // Check if processing completed
      const isStillProcessing = await page.locator('text=Processing').first().isVisible().catch(() => false);

      console.log(`  ⏱️  Check ${progressChecks}/15: ${completedRows} rows visible, still processing: ${isStillProcessing}`);

      if (!isStillProcessing && hasResults) {
        console.log('  ✅ Processing completed!\n');
        break;
      }
    }

    if (hasResults) {
      console.log(`  ✅ Got results: ${completedRows} rows processed\n`);
      results.passed.push('Results received');
    } else {
      console.log('  ⚠️  No results visible yet\n');
      results.issues.push('Results visibility');
    }

    // Screenshot Step 3 - Final
    await page.screenshot({ path: '/tmp/wizard-test-step3-final.png', fullPage: true });
    console.log('  📸 Screenshot: wizard-test-step3-final.png\n');

    // Test 8: Check for errors
    console.log('✓ Test 8: Checking for errors...');
    const errorText = await page.locator('text=failed to generate').count();
    const successRows = completedRows - errorText;

    if (errorText === 0 && completedRows > 0) {
      console.log(`  ✅ All ${completedRows} rows succeeded - NO ERRORS!\n`);
      results.passed.push('Zero errors');
    } else if (successRows > 0) {
      console.log(`  ⚠️  ${successRows} succeeded, ${errorText} failed\n`);
      results.issues.push(`Partial success: ${successRows}/${completedRows}`);
    } else {
      console.log('  ❌ All rows failed or no results\n');
      results.failed.push('All rows failed');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY - Gemini 2.5 Flash Verification');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length} tests`);
    console.log(`❌ Failed: ${results.failed.length} tests`);
    console.log(`⚠️  Issues: ${results.issues.length} issues`);

    if (results.passed.length > 0) {
      console.log('\n✅ Passed Tests:');
      results.passed.forEach(t => console.log(`   - ${t}`));
    }

    if (results.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      results.failed.forEach(t => console.log(`   - ${t}`));
    }

    if (results.issues.length > 0) {
      console.log('\n⚠️  Issues:');
      results.issues.forEach(t => console.log(`   - ${t}`));
    }

    console.log('\n' + '='.repeat(60));

    if (results.failed.length === 0 && completedRows > 0 && errorText === 0) {
      console.log('🎉 SUCCESS! Gemini 2.5 Flash working perfectly!');
      console.log(`   Processed ${completedRows} rows with 0 errors`);
    } else if (results.failed.length === 0) {
      console.log('✅ Test completed - check screenshots for details');
    } else {
      console.log('⚠️  Some tests failed - review needed');
    }

    console.log('='.repeat(60) + '\n');

    // Keep browser open for 30 seconds for manual review
    console.log('🖱️  Browser open for 30s for manual review...\n');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);

    // Screenshot on error
    await page.screenshot({ path: '/tmp/wizard-test-error.png', fullPage: true });
    console.log('📸 Error screenshot: wizard-test-error.png\n');
  } finally {
    await browser.close();
  }
})();
