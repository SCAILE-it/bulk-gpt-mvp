const { chromium } = require('playwright');

(async () => {
  console.log('\n🧪 Auth Redirect Fix - Verification Test\n');
  console.log('=========================================\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = { passed: [], failed: [] };
  
  try {
    // TEST 1: Verify redirect includes returnUrl parameter
    console.log('TEST 1: Check /wizard -> /auth?returnUrl=/wizard redirect');
    await page.goto('http://localhost:5004/wizard');
    await page.waitForTimeout(1500);
    
    const currentUrl = page.url();
    console.log('  Current URL: ' + currentUrl);
    
    if (currentUrl.includes('/auth') && currentUrl.includes('returnUrl')) {
      console.log('  ✅ PASS: Redirects to /auth with returnUrl parameter\n');
      results.passed.push('Redirect with returnUrl');
    } else {
      console.log('  ❌ FAIL: Missing returnUrl parameter\n');
      results.failed.push('Redirect with returnUrl');
    }
    
    // TEST 2: Verify login redirects to wizard (not homepage)
    console.log('TEST 2: Sign in and verify redirect to /wizard');
    
    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    console.log('  Filled login credentials');
    
    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log('  Final URL after login: ' + finalUrl);
    
    if (finalUrl.includes('/wizard')) {
      console.log('  ✅ PASS: Redirected to /wizard after login\n');
      results.passed.push('Post-login redirect to wizard');
    } else if (finalUrl.includes('/auth')) {
      console.log('  ⚠️  WARNING: Still on auth page (may need more time)\n');
      results.failed.push('Post-login redirect to wizard');
    } else {
      console.log('  ❌ FAIL: Redirected to wrong page: ' + finalUrl + '\n');
      results.failed.push('Post-login redirect to wizard');
    }
    
    // TEST 3: Verify wizard UI loads
    console.log('TEST 3: Check if wizard UI loads correctly');
    
    const wizardHeading = await page.locator('h1, h2').first().textContent().catch(() => null);
    console.log('  Page heading: ' + wizardHeading);
    
    if (wizardHeading && !wizardHeading.includes('Bulk GPT')) {
      console.log('  ✅ PASS: Wizard interface loaded (not homepage)\n');
      results.passed.push('Wizard UI loads');
    } else if (wizardHeading && wizardHeading.includes('Bulk GPT')) {
      console.log('  ❌ FAIL: Loaded homepage instead of wizard\n');
      results.failed.push('Wizard UI loads');
    } else {
      console.log('  ⚠️  WARNING: Could not verify page content\n');
      results.failed.push('Wizard UI loads');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    results.failed.push('Test execution');
  }
  
  await browser.close();
  
  // Summary
  console.log('\n=========================================');
  console.log('📊 TEST RESULTS\n');
  console.log('✅ Passed: ' + results.passed.length);
  results.passed.forEach(t => console.log('   - ' + t));
  console.log('\n❌ Failed: ' + results.failed.length);
  results.failed.forEach(t => console.log('   - ' + t));
  
  const totalTests = results.passed.length + results.failed.length;
  const passRate = Math.round((results.passed.length / totalTests) * 100);
  
  console.log('\n📈 Pass Rate: ' + passRate + '% (' + results.passed.length + '/' + totalTests + ')');
  console.log('=========================================\n');
  
  if (results.failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED! Auth redirect fix is working!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review results above.\n');
    process.exit(1);
  }
})();
