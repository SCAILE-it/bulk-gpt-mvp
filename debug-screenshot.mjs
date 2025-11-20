import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    console.log('Going to login page...');
    await page.goto('http://localhost:3000/auth/login');
    
    // Wait with multiple checks
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      const inputs = await page.$$('input');
      const buttons = await page.$$('button');
      console.log(`Check ${i+1}: ${inputs.length} inputs, ${buttons.length} buttons`);
      
      if (inputs.length > 0) {
        console.log('Form found!');
        break;
      }
    }
    
    // Try with locator and longer timeout
    console.log('Trying with locator...');
    const emailInput = page.locator('input[type="email"], input:first-of-type');
    try {
      await emailInput.waitFor({ timeout: 5000 });
      console.log('Email input found!');
      
      await emailInput.fill('test@bulkgpt.local');
      const passwordInput = page.locator('input[type="password"], input:nth-of-type(2)');
      await passwordInput.fill('Test123456!');
      
      const signInBtn = page.locator('button:has-text("Sign in")');
      await signInBtn.click();
      
      console.log('Form submitted');
      await page.waitForTimeout(5000);
    } catch (e) {
      console.log('Could not interact with form:', e.message);
    }
    
    // Navigate to bulk
    console.log('Going to /agents/bulk');
    await page.goto('http://localhost:3000/agents/bulk');
    console.log('Current URL:', page.url());
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false });
    console.log('Screenshot saved');
    
  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
