import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    // Navigate to login
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    
    // Debug: see what's on the page
    const content = await page.content();
    console.log('Page has form elements:', content.includes('<input'));
    
    // Try to find inputs using page.locator (more reliable)
    console.log('2. Finding email input...');
    const emailInput = page.locator('input').first();
    const isVisible = await emailInput.isVisible().catch(() => false);
    console.log('Email input visible:', isVisible);
    
    if (isVisible) {
      console.log('3. Filling email...');
      await emailInput.fill('test@bulkgpt.local');
      await page.waitForTimeout(500);
      
      console.log('4. Finding password input...');
      const passwordInput = page.locator('input').nth(1);
      await passwordInput.fill('Test123456!');
      await page.waitForTimeout(500);
      
      console.log('5. Clicking sign in button...');
      const signInBtn = page.locator('button').filter({ hasText: 'Sign in' });
      await signInBtn.click();
      
      console.log('6. Waiting for navigation...');
      await page.waitForURL('**/home', { timeout: 30000 }).catch(e => console.log('Home navigation:', e.message));
    }
    
    // Navigate directly to agents/bulk
    console.log('7. Navigating to /agents/bulk...');
    await page.goto('http://localhost:3000/agents/bulk', { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    
    console.log('8. Taking screenshot...');
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false });
    console.log('✅ Screenshot saved to /tmp/run-page.png');
    
  } catch (e) {
    console.error('Error:', e.message);
    try {
      console.log('Taking screenshot anyway...');
      await page.screenshot({ path: '/tmp/run-page.png', fullPage: false });
    } catch (e2) {
      console.error('Screenshot failed:', e2.message);
    }
  } finally {
    await browser.close();
  }
})();
