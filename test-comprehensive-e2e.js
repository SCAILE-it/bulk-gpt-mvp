const { chromium } = require('playwright');

const BASE_URL = 'https://bulk-gpt-app.vercel.app';
const TEST_EMAIL = `test-${Date.now()}@bulkgpt.test`;
const TEST_PASSWORD = 'Test123456!';

// Viewport configurations
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },      // iPhone SE
  mobileLarge: { width: 414, height: 896 }, // iPhone 11 Pro Max
  tablet: { width: 768, height: 1024 },     // iPad
  tabletLandscape: { width: 1024, height: 768 }, // iPad Landscape
  desktop: { width: 1920, height: 1080 },   // Full HD
  desktopSmall: { width: 1280, height: 720 }, // HD
};

// Edge case test data
const EDGE_CASES = {
  emails: [
    'test@example.com',                    // Normal
    'verylongemailaddressthatmightbreakthelayout@example.com', // Long email
    'test+tag@example.com',                // Plus sign
    'test.email@example.co.uk',            // Multiple dots
    'test_email@example-domain.com',       // Underscore and hyphen
    'a@b.co',                              // Short domain
    'test@subdomain.example.com',          // Subdomain
    '',                                     // Empty
    'invalid',                              // Invalid format
    'test@',                                // Missing domain
    '@example.com',                         // Missing local part
    'test..test@example.com',              // Double dots
    'test@example..com',                   // Double dots in domain
  ],
  passwords: [
    'Test123456!',                         // Valid
    'a',                                   // Too short
    '12345678',                            // Only numbers
    'abcdefgh',                            // Only letters
    'ABCDEFGH',                            // Only uppercase
    'abcdefghijklmnopqrstuvwxyz123456',    // Long but no uppercase
    'Test123456!'.repeat(10),              // Very long
    '',                                    // Empty
    'Test1!',                              // Too short
    'test123456!',                         // No uppercase
    'TEST123456!',                         // No lowercase
    'Test123456',                          // No special char
    'Test!!!!!!',                          // No numbers
  ],
  specialChars: [
    'test@example.com',
    'test+tag@example.com',
    'test.email@example.co.uk',
    'test_email@example-domain.com',
    'test123@example.com',
  ],
};

async function runTestSuite(browser, viewportName, viewport) {
  const page = await browser.newPage();
  await page.setViewportSize(viewport);
  
  const results = {
    viewport: viewportName,
    tests: {},
  };
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  TESTING: ${viewportName.toUpperCase()} (${viewport.width}x${viewport.height})`);
  console.log('='.repeat(60));
  
  try {
    // TEST 1: Layout & Responsiveness
    console.log(`\n[${viewportName}] TEST 1: Layout & Responsiveness`);
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      // Check if form is visible and properly sized
      const form = page.locator('form').first();
      const formVisible = await form.isVisible();
      const formBox = await form.boundingBox();
      
      // Check if form fits within viewport
      const fitsViewport = formBox && formBox.width <= viewport.width && formBox.height <= viewport.height;
      
      // Check for horizontal scroll (bad for mobile)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      
      results.tests.layout = {
        passed: formVisible && fitsViewport && !hasHorizontalScroll,
        formVisible,
        fitsViewport,
        hasHorizontalScroll,
        formSize: formBox ? `${Math.round(formBox.width)}x${Math.round(formBox.height)}` : 'unknown',
      };
      
      console.log(`  ✓ Form visible: ${formVisible}`);
      console.log(`  ✓ Fits viewport: ${fitsViewport}`);
      console.log(`  ✓ No horizontal scroll: ${!hasHorizontalScroll}`);
    } catch (error) {
      results.tests.layout = { passed: false, error: error.message };
      console.log(`  ✗ Layout test failed: ${error.message}`);
    }
    
    // TEST 2: Sign-Up Edge Cases
    console.log(`\n[${viewportName}] TEST 2: Sign-Up Edge Cases`);
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first();
      await signUpLink.click();
      await page.waitForTimeout(500);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const confirmInput = page.locator('input[type="password"]').nth(1);
      const submitButton = page.locator('button:has-text("Create account")').first();
      
      const edgeCaseResults = [];
      
      // Test each email edge case
      for (const email of EDGE_CASES.emails.slice(0, 5)) { // Test first 5 to avoid too long
        await emailInput.fill(email);
        await passwordInput.fill(TEST_PASSWORD);
        await confirmInput.fill(TEST_PASSWORD);
        await submitButton.click();
        await page.waitForTimeout(500);
        
        const errorMessage = page.locator('[role="alert"]').first();
        const hasError = await errorMessage.count() > 0;
        
        // Clear for next test
        await emailInput.fill('');
        await passwordInput.fill('');
        await confirmInput.fill('');
        await page.waitForTimeout(200);
        
        edgeCaseResults.push({
          email: email.substring(0, 30),
          handled: hasError || email === '' || !email.includes('@'),
        });
      }
      
      results.tests.signUpEdgeCases = {
        passed: edgeCaseResults.every(r => r.handled),
        cases: edgeCaseResults,
      };
      
      console.log(`  ✓ Tested ${edgeCaseResults.length} email edge cases`);
      console.log(`  ✓ All handled correctly: ${results.tests.signUpEdgeCases.passed}`);
    } catch (error) {
      results.tests.signUpEdgeCases = { passed: false, error: error.message };
      console.log(`  ✗ Sign-up edge cases failed: ${error.message}`);
    }
    
    // TEST 3: Password Edge Cases
    console.log(`\n[${viewportName}] TEST 3: Password Edge Cases`);
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first();
      await signUpLink.click();
      await page.waitForTimeout(500);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const confirmInput = page.locator('input[type="password"]').nth(1);
      const submitButton = page.locator('button:has-text("Create account")').first();
      
      await emailInput.fill('test@example.com');
      
      const passwordResults = [];
      
      // Test password edge cases
      for (const password of EDGE_CASES.passwords.slice(0, 8)) {
        await passwordInput.fill(password);
        await confirmInput.fill(password);
        await submitButton.click();
        await page.waitForTimeout(500);
        
        const errorMessage = page.locator('[role="alert"]').first();
        const hasError = await errorMessage.count() > 0;
        const errorText = hasError ? await errorMessage.textContent() : '';
        
        // Clear for next test
        await passwordInput.fill('');
        await confirmInput.fill('');
        await page.waitForTimeout(200);
        
        const isValid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
        passwordResults.push({
          password: password.substring(0, 20) + (password.length > 20 ? '...' : ''),
          handled: hasError || isValid,
          expectedError: !isValid,
        });
      }
      
      results.tests.passwordEdgeCases = {
        passed: passwordResults.every(r => r.handled),
        cases: passwordResults,
      };
      
      console.log(`  ✓ Tested ${passwordResults.length} password edge cases`);
      console.log(`  ✓ All handled correctly: ${results.tests.passwordEdgeCases.passed}`);
    } catch (error) {
      results.tests.passwordEdgeCases = { passed: false, error: error.message };
      console.log(`  ✗ Password edge cases failed: ${error.message}`);
    }
    
    // TEST 4: Mobile-Specific Interactions
    if (viewport.width <= 768) {
      console.log(`\n[${viewportName}] TEST 4: Mobile-Specific Interactions`);
      try {
        await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        
        // Test touch interactions
        const emailInput = page.locator('input[type="email"]').first();
        await emailInput.tap();
        await page.waitForTimeout(500);
        
        // Check if keyboard appears (input is focused)
        const isFocused = await emailInput.evaluate(el => document.activeElement === el);
        
        // Test password visibility toggle on mobile
        const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first();
        await signUpLink.click();
        await page.waitForTimeout(500);
        
        const passwordInput = page.locator('input[type="password"]').first();
        const eyeButton = page.locator('button[aria-label*="password" i]').first();
        
        await passwordInput.tap();
        await page.waitForTimeout(300);
        
        await eyeButton.tap();
        await page.waitForTimeout(300);
        
        const passwordType = await passwordInput.getAttribute('type');
        const toggleWorks = passwordType === 'text';
        
        // Test form submission on mobile
        await emailInput.fill('test@example.com');
        await passwordInput.fill(TEST_PASSWORD);
        const confirmInput = page.locator('input[type="password"]').nth(1);
        await confirmInput.fill(TEST_PASSWORD);
        
        const submitButton = page.locator('button:has-text("Create account")').first();
        const submitBox = await submitButton.boundingBox();
        const submitTappable = submitBox && submitBox.height >= 44; // iOS minimum tap target
        
        results.tests.mobileInteractions = {
          passed: isFocused && toggleWorks && submitTappable,
          touchFocus: isFocused,
          toggleWorks,
          submitTappable,
          submitHeight: submitBox ? Math.round(submitBox.height) : 0,
        };
        
        console.log(`  ✓ Touch focus works: ${isFocused}`);
        console.log(`  ✓ Password toggle works: ${toggleWorks}`);
        console.log(`  ✓ Submit button tappable (≥44px): ${submitTappable}`);
      } catch (error) {
        results.tests.mobileInteractions = { passed: false, error: error.message };
        console.log(`  ✗ Mobile interactions failed: ${error.message}`);
      }
    }
    
    // TEST 5: Keyboard Navigation
    console.log(`\n[${viewportName}] TEST 5: Keyboard Navigation`);
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      // Tab navigation
      await emailInput.focus();
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      const passwordFocused = await passwordInput.evaluate(el => document.activeElement === el);
      
      // Enter key submission
      await emailInput.fill('test@bulkgpt.local');
      await passwordInput.fill('Test123456!');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      const submitted = !page.url().includes('/auth') || await page.locator('[role="alert"]').count() > 0;
      
      results.tests.keyboardNav = {
        passed: passwordFocused && submitted,
        tabWorks: passwordFocused,
        enterSubmits: submitted,
      };
      
      console.log(`  ✓ Tab navigation works: ${passwordFocused}`);
      console.log(`  ✓ Enter key submits: ${submitted}`);
    } catch (error) {
      results.tests.keyboardNav = { passed: false, error: error.message };
      console.log(`  ✗ Keyboard navigation failed: ${error.message}`);
    }
    
    // TEST 6: Error Handling Edge Cases
    console.log(`\n[${viewportName}] TEST 6: Error Handling Edge Cases`);
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first();
      await signUpLink.click();
      await page.waitForTimeout(500);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const confirmInput = page.locator('input[type="password"]').nth(1);
      const submitButton = page.locator('button:has-text("Create account")').first();
      
      // Test rapid clicking (should not submit multiple times)
      await emailInput.fill('test@example.com');
      await passwordInput.fill(TEST_PASSWORD);
      await confirmInput.fill(TEST_PASSWORD);
      
      await submitButton.click();
      await submitButton.click();
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      // Should only show one error/success message
      const messages = await page.locator('[role="alert"]').count();
      const noDuplicateMessages = messages <= 1;
      
      // Test error message visibility
      await emailInput.fill('invalid');
      await passwordInput.fill('weak');
      await confirmInput.fill('weak');
      await submitButton.click();
      await page.waitForTimeout(500);
      
      const errorMessage = page.locator('[role="alert"]').first();
      const errorVisible = await errorMessage.isVisible();
      const errorText = await errorMessage.textContent();
      const errorReadable = errorText && errorText.length > 0 && errorText.length < 200;
      
      results.tests.errorHandling = {
        passed: noDuplicateMessages && errorVisible && errorReadable,
        noDuplicates: noDuplicateMessages,
        errorVisible,
        errorReadable,
      };
      
      console.log(`  ✓ No duplicate messages: ${noDuplicateMessages}`);
      console.log(`  ✓ Error message visible: ${errorVisible}`);
      console.log(`  ✓ Error message readable: ${errorReadable}`);
    } catch (error) {
      results.tests.errorHandling = { passed: false, error: error.message };
      console.log(`  ✗ Error handling failed: ${error.message}`);
    }
    
    // TEST 7: Form State Persistence
    console.log(`\n[${viewportName}] TEST 7: Form State Persistence`);
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      // Fill form
      await emailInput.fill('test@example.com');
      await passwordInput.fill('Test123456!');
      
      // Switch modes
      const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first();
      await signUpLink.click();
      await page.waitForTimeout(500);
      
      const backLink = page.locator('button:has-text("Already have")').first();
      await backLink.click();
      await page.waitForTimeout(500);
      
      // Check if form was cleared (should be cleared when switching modes)
      const emailValue = await emailInput.inputValue();
      const passwordValue = await passwordInput.inputValue();
      
      const formCleared = emailValue === '' && passwordValue === '';
      
      results.tests.formState = {
        passed: formCleared,
        emailCleared: emailValue === '',
        passwordCleared: passwordValue === '',
      };
      
      console.log(`  ✓ Form cleared on mode switch: ${formCleared}`);
    } catch (error) {
      results.tests.formState = { passed: false, error: error.message };
      console.log(`  ✗ Form state test failed: ${error.message}`);
    }
    
    // TEST 8: Loading States
    console.log(`\n[${viewportName}] TEST 8: Loading States`);
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const signInButton = page.locator('button:has-text("Sign in")').first();
      
      await emailInput.fill('test@bulkgpt.local');
      await passwordInput.fill('Test123456!');
      
      // Click and immediately check for loading state
      const clickPromise = signInButton.click();
      await page.waitForTimeout(100); // Small delay to catch loading state
      
      const buttonText = await signInButton.textContent();
      const isLoading = buttonText?.includes('Signing') || buttonText?.includes('...');
      const buttonDisabled = await signInButton.isDisabled();
      
      await clickPromise;
      await page.waitForTimeout(2000);
      
      results.tests.loadingStates = {
        passed: isLoading || buttonDisabled,
        showsLoading: isLoading,
        buttonDisabled,
      };
      
      console.log(`  ✓ Shows loading state: ${isLoading || buttonDisabled}`);
    } catch (error) {
      results.tests.loadingStates = { passed: false, error: error.message };
      console.log(`  ✗ Loading states test failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`\n[${viewportName}] Fatal error: ${error.message}`);
    results.error = error.message;
  } finally {
    await page.close();
  }
  
  return results;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  const allResults = [];
  
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  COMPREHENSIVE E2E TESTING: EDGE CASES & RESPONSIVE DESIGN');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Test all viewports
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      const result = await runTestSuite(browser, name, viewport);
      allResults.push(result);
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    let totalTests = 0;
    let passedTests = 0;
    
    for (const result of allResults) {
      console.log(`\n${result.viewport.toUpperCase()}:`);
      const testCount = Object.keys(result.tests).length;
      const passedCount = Object.values(result.tests).filter(t => t.passed !== false).length;
      totalTests += testCount;
      passedTests += passedCount;
      
      console.log(`  Tests: ${passedCount}/${testCount} passed`);
      
      for (const [testName, testResult] of Object.entries(result.tests)) {
        const status = testResult.passed !== false ? '✓' : '✗';
        console.log(`  ${status} ${testName}`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`\nTotal Tests Across All Viewports: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED ACROSS ALL VIEWPORTS!');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Review output above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();


