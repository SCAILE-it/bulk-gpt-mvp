/**
 * Wizard UX Test - Height Stability & Smooth Transitions
 * Tests the fix for height jumping between wizard steps
 */

const { chromium } = require('playwright');

(async () => {
  console.log('\n🎨 Wizard UX Quality Test - Height Stability\n');
  console.log('Testing on: http://localhost:3001/wizard\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  const results = {
    passed: [],
    failed: [],
    measurements: {}
  };

  try {
    // Test 1: Load wizard and measure initial height
    console.log('✓ Test 1: Initial load & auth...');
    await page.goto('http://localhost:3001/wizard');
    await page.waitForTimeout(1000);

    // Sign in
    if (page.url().includes('/auth')) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // Measure Step 1 container height
    const step1Container = await page.locator('main').first();
    const step1Height = await step1Container.evaluate(el => el.getBoundingClientRect().height);
    results.measurements.step1ContainerHeight = step1Height;
    console.log(`  📏 Step 1 container height: ${step1Height}px`);

    // Test 2: Upload file and measure height change
    console.log('\n✓ Test 2: File upload transition...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-data.csv');
    await page.waitForTimeout(1500); // Wait for preview to render

    const step1HeightAfterUpload = await step1Container.evaluate(el => el.getBoundingClientRect().height);
    results.measurements.step1AfterUpload = step1HeightAfterUpload;
    console.log(`  📏 Step 1 after upload: ${step1HeightAfterUpload}px`);

    // Height should remain the same due to fixed viewport
    if (Math.abs(step1Height - step1HeightAfterUpload) < 5) {
      console.log('  ✅ Container height stable during upload');
      results.passed.push('Height stability - upload');
    } else {
      console.log(`  ⚠️  Container height changed by ${Math.abs(step1Height - step1HeightAfterUpload)}px`);
      results.failed.push('Height stability - upload');
    }

    // Test 3: Transition to Step 2
    console.log('\n✓ Test 3: Step 1 → Step 2 transition...');

    // Take screenshot before transition
    await page.screenshot({ path: '/tmp/wizard-step1-before-transition.png', fullPage: false });
    console.log('  📸 Screenshot: step1-before-transition.png');

    const continueBtn = await page.locator('text=Continue').first();
    await continueBtn.click();

    // Wait for animation to complete (300ms as per our implementation)
    await page.waitForTimeout(500);

    // Measure Step 2 container height
    const step2Height = await step1Container.evaluate(el => el.getBoundingClientRect().height);
    results.measurements.step2ContainerHeight = step2Height;
    console.log(`  📏 Step 2 container height: ${step2Height}px`);

    // Take screenshot after transition
    await page.screenshot({ path: '/tmp/wizard-step2-after-transition.png', fullPage: false });
    console.log('  📸 Screenshot: step2-after-transition.png');

    // Height should remain exactly the same due to fixed viewport
    if (Math.abs(step1HeightAfterUpload - step2Height) < 5) {
      console.log('  ✅ Container height stable during step transition');
      results.passed.push('Height stability - step transition');
    } else {
      console.log(`  ❌ Container height changed by ${Math.abs(step1HeightAfterUpload - step2Height)}px`);
      results.failed.push('Height stability - step transition');
    }

    // Test 4: Check for AnimatePresence smooth transition
    console.log('\n✓ Test 4: Smooth animation check...');

    // Navigate back to Step 1 to test reverse transition
    const backBtn = await page.locator('text=Back').first();
    await backBtn.click();
    await page.waitForTimeout(500);

    const step1HeightReturn = await step1Container.evaluate(el => el.getBoundingClientRect().height);

    if (Math.abs(step1HeightReturn - step1HeightAfterUpload) < 5) {
      console.log('  ✅ Container height stable on back navigation');
      results.passed.push('Height stability - back navigation');
    } else {
      console.log(`  ❌ Container height changed by ${Math.abs(step1HeightReturn - step1HeightAfterUpload)}px`);
      results.failed.push('Height stability - back navigation');
    }

    // Test 5: Check overflow scroll
    console.log('\n✓ Test 5: Scroll behavior check...');

    // Navigate back to Step 2
    const continueBtn2 = await page.locator('text=Continue').first();
    await continueBtn2.click();
    await page.waitForTimeout(500);

    // Check if main container has overflow-y-auto
    const hasOverflow = await step1Container.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.overflowY === 'auto' || style.overflowY === 'scroll';
    });

    if (hasOverflow) {
      console.log('  ✅ Container has overflow scroll enabled');
      results.passed.push('Overflow scroll enabled');
    } else {
      console.log('  ❌ Container missing overflow scroll');
      results.failed.push('Overflow scroll enabled');
    }

    // Test 6: Verify Motion animations are working
    console.log('\n✓ Test 6: Motion animation check...');

    // Check if opacity transition is happening
    // This is a bit tricky - we'll check if the step content is visible
    const step2Content = await page.locator('text=Write your prompt').first();
    const isVisible = await step2Content.isVisible();

    if (isVisible) {
      console.log('  ✅ Step 2 content rendered after animation');
      results.passed.push('Animation renders content');
    } else {
      console.log('  ❌ Step 2 content not visible');
      results.failed.push('Animation renders content');
    }

    // Test 7: All existing functionality still works
    console.log('\n✓ Test 7: Functionality check...');

    // Fill prompt
    const textarea = await page.locator('textarea').first();
    await textarea.fill('Test prompt for {{name}}');
    await page.waitForTimeout(300);
    console.log('  ✅ Prompt entry works');
    results.passed.push('Prompt entry');

    // Check Test/Full mode selector
    const testMode = await page.locator('text=Test').first().isVisible();
    const fullMode = await page.locator('text=Full').first().isVisible();

    if (testMode && fullMode) {
      console.log('  ✅ Processing mode selector visible');
      results.passed.push('Processing mode selector');
    } else {
      console.log('  ❌ Processing mode selector missing');
      results.failed.push('Processing mode selector');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length} tests`);
    console.log(`❌ Failed: ${results.failed.length} tests`);

    console.log('\n📏 Height Measurements:');
    console.log(`  Step 1 (initial): ${results.measurements.step1ContainerHeight}px`);
    console.log(`  Step 1 (after upload): ${results.measurements.step1AfterUpload}px`);
    console.log(`  Step 2: ${results.measurements.step2ContainerHeight}px`);
    console.log(`  Max deviation: ${Math.max(
      Math.abs(results.measurements.step1ContainerHeight - results.measurements.step1AfterUpload),
      Math.abs(results.measurements.step1AfterUpload - results.measurements.step2ContainerHeight)
    )}px`);

    if (results.passed.length > 0) {
      console.log('\n✅ Passed Tests:');
      results.passed.forEach(t => console.log(`   - ${t}`));
    }

    if (results.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      results.failed.forEach(t => console.log(`   - ${t}`));
    }

    console.log('\n' + '='.repeat(60));

    if (results.failed.length === 0) {
      console.log('🎉 ALL TESTS PASSED! UX fix successful!');
    } else {
      console.log('⚠️  Some tests failed - review needed');
    }

    console.log('='.repeat(60) + '\n');

    // Keep browser open for manual verification
    console.log('🖱️  Browser left open for manual testing');
    console.log('   Close browser when done.\n');

    await page.waitForTimeout(60000); // 1 minute

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
})();
