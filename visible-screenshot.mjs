import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false }); // Non-headless
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    console.log('Navigating to /agents/bulk (non-headless)...');
    await page.goto('http://localhost:3000/agents/bulk');
    
    // Wait longer
    await page.waitForTimeout(8000);
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false });
    console.log('Screenshot saved');
    
    // Keep browser open for 10 seconds so you can see it
    console.log('Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
