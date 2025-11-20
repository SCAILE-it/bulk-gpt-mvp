import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    // Navigate to login with longer wait
    console.log('1. Navigating to login...');
    await page.goto('http://localhost:3000/auth/login');
    
    // Wait much longer for JS to render form
    console.log('2. Waiting for form to render...');
    await page.waitForTimeout(5000);
    
    // Check if form exists now
    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} input elements`);
    
    if (inputs.length >= 2) {
      console.log('3. Filling email input...');
      await inputs[0].type('test@bulkgpt.local', { delay: 50 });
      
      console.log('4. Filling password input...');
      await inputs[1].type('Test123456!', { delay: 50 });
      
      console.log('5. Finding and clicking sign in button...');
      const buttons = await page.$$('button');
      let clicked = false;
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text && text.includes('Sign in')) {
          await btn.click();
          clicked = true;
          console.log('Button clicked');
          break;
        }
      }
      
      if (!clicked) {
        console.log('Could not find sign in button');
      }
      
      // Wait for navigation
      console.log('6. Waiting after button click...');
      await page.waitForTimeout(5000);
    } else {
      console.log('Form inputs not found, trying direct navigation');
    }
    
    // Go directly to agents/bulk - should work if already logged in or show login
    console.log('7. Navigating to /agents/bulk...');
    await page.goto('http://localhost:3000/agents/bulk');
    await page.waitForTimeout(4000);
    
    // Check current URL
    const url = page.url();
    console.log('Current URL:', url);
    console.log('Is on agents/bulk:', url.includes('/agents/bulk'));
    console.log('Is on auth:', url.includes('/auth'));
    
    console.log('8. Taking screenshot...');
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false });
    console.log('✅ Screenshot saved');
    
  } catch (e) {
    console.error('Error:', e.message);
    console.log('Taking screenshot anyway...');
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false }).catch(e2 => console.error('Screenshot failed:', e2.message));
  } finally {
    await browser.close();
  }
})();
