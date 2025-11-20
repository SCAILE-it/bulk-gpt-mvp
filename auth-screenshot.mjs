import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    // Go to login page
    console.log('Going to login...');
    await page.goto('http://localhost:3000/auth/login');
    
    // Wait for inputs to appear
    console.log('Waiting for inputs...');
    await page.waitForSelector('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]', { timeout: 10000 });
    
    const emailInput = await page.$('input[type="email"]') || await page.$('input[placeholder*="email"]') || await page.$('input[placeholder*="Email"]');
    const passwordInput = await page.$('input[type="password"]') || await page.$('input[placeholder*="password"]');
    
    if (emailInput && passwordInput) {
      console.log('Found inputs, filling...');
      await emailInput.fill('test@bulkgpt.local');
      await passwordInput.fill('Test123456!');
      
      // Click button
      const btn = await page.$('button:has-text("Sign in")') || await page.$('button');
      if (btn) {
        console.log('Clicking sign in');
        await btn.click();
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('Could not find email or password inputs');
    }
    
    // Navigate to agents/bulk
    console.log('Navigating to RUN page...');
    await page.goto('http://localhost:3000/agents/bulk');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false });
    console.log('Screenshot saved');
  } catch (e) {
    console.error('Error:', e.message);
    // Still try to take screenshot even if error
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
