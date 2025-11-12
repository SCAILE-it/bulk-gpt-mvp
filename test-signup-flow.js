const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== Testing Sign-Up Flow ===\n');
    
    // Navigate to auth page
    console.log('1. Navigating to auth page...');
    await page.goto('https://bulk-gpt-app.vercel.app/auth', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check for sign-up link
    console.log('2. Checking for sign-up functionality...');
    const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have"), a:has-text("Sign up")').first();
    const hasSignUp = await signUpLink.count() > 0;
    
    if (hasSignUp) {
      console.log('   ✓ Sign-up link found');
      const linkText = await signUpLink.textContent();
      console.log(`   Link text: "${linkText?.trim()}"`);
      
      // Click sign-up
      await signUpLink.click();
      await page.waitForTimeout(1000);
      
      // Check if form changed to sign-up mode
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
      
      const emailExists = await emailInput.count() > 0;
      const passwordExists = await passwordInput.count() > 0;
      const confirmExists = await confirmPasswordInput.count() > 0;
      
      console.log('\n3. Sign-up form elements:');
      console.log(`   ✓ Email input: ${emailExists}`);
      console.log(`   ✓ Password input: ${passwordExists}`);
      console.log(`   ✓ Confirm password input: ${confirmExists}`);
      
      if (emailExists && passwordExists && confirmExists) {
        console.log('\n   ✓ Sign-up form is properly displayed!');
        
        // Check for password visibility toggle
        const eyeIcon = page.locator('button[aria-label*="password" i], svg').first();
        const hasEyeIcon = await eyeIcon.count() > 0;
        console.log(`   ✓ Password visibility toggle: ${hasEyeIcon}`);
        
        // Check for validation message
        const validationText = page.locator('text=/at least 8 characters/i');
        const hasValidation = await validationText.count() > 0;
        console.log(`   ✓ Password validation hint: ${hasValidation}`);
      }
      
      // Test password reset link
      console.log('\n4. Testing password reset link...');
      const resetLink = page.locator('button:has-text("Forgot"), a:has-text("Forgot")').first();
      const hasReset = await resetLink.count() > 0;
      
      if (hasReset) {
        console.log('   ✓ Password reset link found');
        await resetLink.click();
        await page.waitForTimeout(1000);
        
        const resetForm = page.locator('input[type="email"]').first();
        const resetExists = await resetForm.count() > 0;
        console.log(`   ✓ Reset form displayed: ${resetExists}`);
      }
    } else {
      console.log('   ✗ Sign-up link not found');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'signup-test-error.png' });
  } finally {
    await browser.close();
  }
})();


