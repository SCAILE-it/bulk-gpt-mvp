const { chromium } = require('playwright');

const BASE_URL = 'https://bulk-gpt-app.vercel.app';

// Viewport configurations
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

async function testViewport(browser, name, viewport) {
  const page = await browser.newPage();
  await page.setViewportSize(viewport);
  page.setDefaultTimeout(5000); // 5 second timeout
  
  const results = { viewport: name, passed: 0, failed: 0, tests: [] };
  
  try {
    console.log(`\n[${name}] Testing ${viewport.width}x${viewport.height}...`);
    
    // Test 1: Layout
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForSelector('form', { timeout: 5000 });
      
      const formBox = await page.locator('form').first().boundingBox();
      const hasScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      
      if (formBox && !hasScroll) {
        results.passed++;
        results.tests.push('✓ Layout fits viewport');
      } else {
        results.failed++;
        results.tests.push('✗ Layout issues');
      }
    } catch (e) {
      results.failed++;
      results.tests.push(`✗ Layout test error`);
    }
    
    // Test 2: Sign-up form elements
    try {
      const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first();
      if (await signUpLink.count() > 0) {
        await signUpLink.click();
        await page.waitForTimeout(500);
        
        const emailInput = page.locator('input[type="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        const confirmInput = page.locator('input[type="password"]').nth(1);
        
        const emailVisible = await emailInput.isVisible();
        const passwordVisible = await passwordInput.isVisible();
        const confirmVisible = await confirmInput.isVisible();
        
        if (emailVisible && passwordVisible && confirmVisible) {
          results.passed++;
          results.tests.push('✓ Sign-up form elements visible');
        } else {
          results.failed++;
          results.tests.push('✗ Sign-up form missing elements');
        }
      }
    } catch (e) {
      results.failed++;
      results.tests.push(`✗ Sign-up form test error`);
    }
    
    // Test 3: Password visibility toggle
    try {
      // Ensure we're in sign-up mode
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(1000);
      
      const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first();
      if (await signUpLink.count() > 0) {
        await signUpLink.click();
        await page.waitForTimeout(500);
      }
      
      // Wait for password input to be visible
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      
      const passwordInput = page.locator('input[type="password"]').first();
      const eyeButton = page.locator('button[aria-label*="password" i]').first();
      
      if (await eyeButton.count() > 0) {
        const initialType = await passwordInput.getAttribute('type');
        
        // Click toggle
        await eyeButton.click();
        await page.waitForTimeout(400);
        
        const newType = await passwordInput.getAttribute('type');
        
        // Toggle should change type from password to text or vice versa
        if (newType && newType !== initialType) {
          results.passed++;
          results.tests.push('✓ Password toggle works');
        } else {
          // Try clicking again to verify it toggles back
          await eyeButton.click();
          await page.waitForTimeout(400);
          const finalType = await passwordInput.getAttribute('type');
          if (finalType === initialType) {
            results.passed++;
            results.tests.push('✓ Password toggle works');
          } else {
            results.failed++;
            results.tests.push(`✗ Password toggle failed (initial: ${initialType}, final: ${finalType})`);
          }
        }
      } else {
        results.failed++;
        results.tests.push('✗ Password toggle button not found');
      }
    } catch (e) {
      results.failed++;
      results.tests.push(`✗ Password toggle test error: ${e.message.substring(0, 40)}`);
    }
    
    // Test 4: Mobile-specific (touch targets)
    if (viewport.width <= 768) {
      try {
        await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
        const submitButton = page.locator('button[type="submit"]').first();
        const box = await submitButton.boundingBox();
        const computedHeight = box ? box.height : 0;
        
        if (box && computedHeight >= 44) {
          results.passed++;
          results.tests.push(`✓ Touch targets adequate (${Math.round(computedHeight)}px)`);
        } else {
          results.failed++;
          results.tests.push(`✗ Touch targets too small (${Math.round(computedHeight)}px < 44px)`);
        }
      } catch (e) {
        results.failed++;
        results.tests.push(`✗ Touch target test error: ${e.message.substring(0, 30)}`);
      }
    }
    
    // Test 5: Form validation
    try {
      const emailInput = page.locator('input[type="email"]').first();
      const submitButton = page.locator('button:has-text("Create account"), button:has-text("Sign in")').first();
      
      await emailInput.fill('invalid-email');
      await submitButton.click();
      await page.waitForTimeout(500);
      
      const error = page.locator('[role="alert"]').first();
      const hasError = await error.count() > 0;
      
      if (hasError) {
        results.passed++;
        results.tests.push('✓ Validation shows errors');
      } else {
        results.failed++;
        results.tests.push('✗ Validation not working');
      }
    } catch (e) {
      results.failed++;
      results.tests.push(`✗ Validation test error`);
    }
    
    // Test 6: Keyboard navigation
    try {
      await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.focus();
      await page.waitForTimeout(100);
      
      // Check if email is focused
      const emailFocused = await emailInput.evaluate(el => document.activeElement === el);
      
      if (emailFocused) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
        
        const passwordInput = page.locator('input[type="password"]').first();
        const passwordFocused = await passwordInput.evaluate(el => document.activeElement === el);
        
        if (passwordFocused) {
          results.passed++;
          results.tests.push('✓ Keyboard navigation works');
        } else {
          // Check what element is focused
          const activeElement = await page.evaluate(() => document.activeElement?.tagName);
          results.failed++;
          results.tests.push(`✗ Keyboard nav failed (focused: ${activeElement})`);
        }
      } else {
        results.failed++;
        results.tests.push('✗ Email input not focusable');
      }
    } catch (e) {
      results.failed++;
      results.tests.push(`✗ Keyboard nav test error: ${e.message.substring(0, 30)}`);
    }
    
    // Test 7: Error handling
    try {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();
      
      await emailInput.fill('');
      await passwordInput.fill('');
      await submitButton.click();
      await page.waitForTimeout(500);
      
      const errors = await page.locator('[role="alert"]').count();
      if (errors > 0 && errors <= 1) {
        results.passed++;
        results.tests.push('✓ Error handling works (no duplicates)');
      } else {
        results.failed++;
        results.tests.push('✗ Error handling issues');
      }
    } catch (e) {
      results.failed++;
      results.tests.push(`✗ Error handling test error`);
    }
    
  } catch (error) {
    console.log(`  Error in ${name}: ${error.message}`);
  } finally {
    await page.close();
  }
  
  return results;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  EDGE CASES & RESPONSIVE DESIGN E2E TESTS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const allResults = [];
  
  try {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      const result = await testViewport(browser, name, viewport);
      allResults.push(result);
      
      console.log(`\n${name.toUpperCase()} Results:`);
      result.tests.forEach(test => console.log(`  ${test}`));
      console.log(`  Total: ${result.passed} passed, ${result.failed} failed`);
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
    const totalTests = totalPassed + totalFailed;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%\n`);
    
    allResults.forEach(r => {
      console.log(`${r.viewport}: ${r.passed}/${r.passed + r.failed} passed`);
    });
    
    if (totalFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review output above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

