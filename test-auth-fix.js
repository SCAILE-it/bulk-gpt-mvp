const { chromium } = require('@playwright/test');

(async () => {
  console.log('\n🔐 Testing Auth Redirect Fix\n');
  console.log('Testing on: http://localhost:3001\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  
  let passed = 0;
  let failed = 0;
  
  try {
    // TEST 1: Visit /wizard without auth - check redirect URL
    console.log('TEST 1: Visiting /wizard without auth...');
    await page.goto('http://localhost:3001/wizard');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth')) {
      console.log('  ✅ Redirected to /auth');
      
      // Check for returnUrl parameter
      if (currentUrl.includes('returnUrl')) {
        console.log('  ✅ returnUrl parameter present');
        
        // Extract and verify returnUrl value
        const url = new URL(currentUrl);
        const returnUrl = url.searchParams.get('returnUrl');
        console.log(`  📍 returnUrl value: "${returnUrl}"`);
        
        if (returnUrl === '/wizard') {
          console.log('  ✅ returnUrl correctly set to /wizard');
          passed++;
        } else {
          console.log(`  ❌ returnUrl is "${returnUrl}", expected "/wizard"`);
          failed++;
        }
      } else {
        console.log('  ❌ returnUrl parameter MISSING');
        failed++;
      }
    } else {
      console.log(`  ❌ Not redirected to /auth (URL: ${currentUrl})`);
      failed++;
    }
    
    console.log('');
    
    // TEST 2: Sign in and check final redirect
    console.log('TEST 2: Signing in and checking redirect...');
    
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
      passed++;
      await page.screenshot({ path: '/tmp/auth-fix-wizard.png', fullPage: true });
      console.log('  📸 Screenshot: /tmp/auth-fix-wizard.png');
    } else if (finalUrl.includes('/auth')) {
      console.log('  ❌ Still on /auth (sign in failed)');
      failed++;
      await page.screenshot({ path: '/tmp/auth-fix-failed.png', fullPage: true });
    } else if (finalUrl === 'http://localhost:3001/') {
      console.log('  ❌ Redirected to homepage (BUG STILL PRESENT)');
      failed++;
      await page.screenshot({ path: '/tmp/auth-fix-homepage.png', fullPage: true });
    } else {
      console.log(`  ❌ Unexpected URL: ${finalUrl}`);
      failed++;
    }
    
    console.log('');
    console.log('═══════════════════════════════════');
    console.log('📊 RESULTS');
    console.log('═══════════════════════════════════');
    console.log(`✅ Passed: ${passed}/2`);
    console.log(`❌ Failed: ${failed}/2`);
    console.log('');
    
    if (failed === 0) {
      console.log('🎉 AUTH FIX VERIFIED!');
      console.log('');
      console.log('✅ Middleware passes returnUrl parameter');
      console.log('✅ Auth page redirects to returnUrl');
      console.log('✅ User lands on wizard after login');
    } else {
      console.log('❌ AUTH FIX NOT WORKING');
      console.log('');
      console.log('Check:');
      console.log('  • Middleware changes applied?');
      console.log('  • Auth page changes applied?');
      console.log('  • Dev server restarted?');
    }
    console.log('═══════════════════════════════════');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    failed++;
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed.\n');
  }
})();
