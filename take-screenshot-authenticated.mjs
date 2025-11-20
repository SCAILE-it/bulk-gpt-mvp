import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport for desktop
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    // Navigate to login
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Try to find and fill email
    console.log('Filling email...');
    const emailInputs = await page.locator('input').all();
    if (emailInputs.length > 0) {
      await emailInputs[0].fill('test@bulkgpt.local');
      await page.waitForTimeout(500);
      
      // Fill password
      if (emailInputs.length > 1) {
        console.log('Filling password...');
        await emailInputs[1].fill('Test123456!');
        await page.waitForTimeout(500);
      }
      
      // Click sign in button
      console.log('Clicking sign in...');
      const buttons = await page.locator('button').all();
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text && text.includes('Sign in')) {
          await btn.click();
          break;
        }
      }
      
      // Wait for navigation
      await page.waitForURL(/\/(home|agents|bulk)/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      // Navigate to RUN page
      console.log('Navigating to RUN page...');
      await page.goto('http://localhost:3000/agents/bulk', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      // Take screenshot
      console.log('Taking screenshot...');
      await page.screenshot({ path: '/tmp/run-page-screenshot.png', fullPage: false });
      console.log('Screenshot saved to /tmp/run-page-screenshot.png');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
