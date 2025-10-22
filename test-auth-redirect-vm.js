const { chromium } = require('@playwright/test');

(async () => {
  console.log('\n🔐 Auth Redirect Fix - Verification Test\n');
  console.log('========================================\n');
  console.log('Testing: VM server via localhost:5004 tunnel\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 300 
  });
  const page = await browser.newPage();
  
  let testResults = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  try {
    // TEST 1: returnUrl parameter present
    console.log('TEST 1: Checking returnUrl parameter...');
    await page.goto('http://localhost:5004/wizard');
    await page.waitForTimeout(2000);
    
    const url1 = page.url();
    console.log(`  URL after visiting /wizard: ${url1}`);
    
    if (url1.includes('/auth')) {
      console.log('  ✅ Redirected to /auth');
      
      if (url1.includes('returnUrl')) {
        console.log('  ✅ returnUrl parameter present');
        
        const urlObj = new URL(url1);
        const returnUrl = urlObj.searchParams.get('returnUrl');
        console.log(`  📍 returnUrl value: "${returnUrl}"`);
        
        if (returnUrl === '/wizard') {
          console.log('  ✅ returnUrl correctly set to "/wizard"\n');
          testResults.passed++;
          testResults.details.push('✅ returnUrl parameter correct');
        } else {
          console.log(`  ❌ returnUrl is "${returnUrl}", expected "/wizard"\n`);
          testResults.failed++;
          testResults.details.push('❌ returnUrl value incorrect');
        }
      } else {
        console.log('  ❌ returnUrl parameter MISSING\n');
        testResults.failed++;
        testResults.details.push('❌ returnUrl parameter missing');
      }
    } else {
      console.log(`  ❌ Not redirected to /auth\n`);
      testResults.failed++;
      testResults.details.push('❌ No redirect to /auth');
    }
    
    // TEST 2: Sign in and check final destination
    console.log('TEST 2: Sign in and verify redirect to /wizard...');
    
    // Check if we're still on auth page
    if (!page.url().includes('/auth')) {
      await page.goto('http://localhost:5004/wizard');
      await page.waitForTimeout(1500);
    }
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    console.log('  📝 Credentials entered');
    
    await page.click('button[type="submit"]');
    console.log('  🔘 Sign in clicked');
    
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log(`  Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('/wizard')) {
      console.log('  ✅ Successfully redirected to /wizard');
      testResults.passed++;
      testResults.details.push('✅ Sign in redirects to /wizard');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'auth-fix-success.png', 
        fullPage: true 
      });
      console.log('  📸 Screenshot: auth-fix-success.png\n');
    } else if (finalUrl.includes('/auth')) {
      console.log('  ❌ Still on /auth (sign in may have failed)');
      testResults.failed++;
      testResults.details.push('❌ Stuck on /auth page');
      
      await page.screenshot({ path: 'auth-fix-stuck-auth.png' });
      console.log('  📸 Screenshot: auth-fix-stuck-auth.png\n');
    } else if (finalUrl === 'http://localhost:5004/') {
      console.log('  ❌ Redirected to homepage - BUG STILL PRESENT');
      testResults.failed++;
      testResults.details.push('❌ Redirected to homepage (old bug)');
      
      await page.screenshot({ path: 'auth-fix-homepage.png' });
      console.log('  📸 Screenshot: auth-fix-homepage.png\n');
    } else {
      console.log(`  ❌ Unexpected redirect: ${finalUrl}`);
      testResults.failed++;
      testResults.details.push(`❌ Unexpected URL: ${finalUrl}`);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    testResults.failed++;
    testResults.details.push(`❌ Error: ${error.message}`);
  }
  
  // Results
  console.log('═══════════════════════════════════');
  console.log('📊 AUTH FIX VERIFICATION RESULTS');
  console.log('═══════════════════════════════════');
  console.log(`✅ Passed: ${testResults.passed}/2 tests`);
  console.log(`❌ Failed: ${testResults.failed}/2 tests`);
  console.log('');
  
  testResults.details.forEach(detail => console.log(detail));
  console.log('');
  
  if (testResults.failed === 0) {
    console.log('🎉 AUTH FIX VERIFIED - All tests passed!');
    console.log('');
    console.log('✅ Middleware adds returnUrl parameter');
    console.log('✅ Auth page redirects to returnUrl');
    console.log('✅ Users land on /wizard after login');
  } else {
    console.log('❌ AUTH FIX NOT VERIFIED - Tests failed');
    console.log('');
    console.log('Possible issues:');
    console.log('  • Files not synced to VM');
    console.log('  • Dev server not restarted');
    console.log('  • Different port running old code');
  }
  console.log('═══════════════════════════════════');
  
  await page.waitForTimeout(5000);
  await browser.close();
  console.log('\n✅ Test complete\n');
})();
