import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    // Go to login
    console.log('Going to login...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
    
    // Use JavaScript to interact with form
    console.log('Attempting to fill form via JavaScript...');
    await page.evaluate(() => {
      // Find inputs
      const inputs = document.querySelectorAll('input');
      if (inputs.length >= 2) {
        inputs[0].value = 'test@bulkgpt.local';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        
        inputs[1].value = 'Test123456!';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('Filled inputs');
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Find and click button
    console.log('Finding button...');
    const button = await page.$('button:has-text("Sign in")');
    if (button) {
      console.log('Clicking button...');
      await button.click();
    } else {
      // Try to find any button with Sign in text
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text && text.includes('Sign in')) {
          console.log('Found and clicking sign in button');
          await btn.click();
          break;
        }
      }
    }
    
    // Wait for navigation
    console.log('Waiting for redirect...');
    try {
      await page.waitForNavigation({ timeout: 10000 });
    } catch (e) {
      console.log('No navigation occurred, continuing anyway');
    }
    
    // Navigate to agents/bulk
    console.log('Going to /agents/bulk...');
    await page.goto('http://localhost:3000/agents/bulk', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(3000);
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false });
    console.log('✅ Screenshot saved');
    
  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
