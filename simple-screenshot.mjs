import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    console.log('Opening page...');
    await page.goto('http://localhost:3000/agents/bulk');
    
    // Just wait and take screenshot
    console.log('Waiting and taking screenshot...');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false });
    console.log('Screenshot saved');
  } catch (e) {
    console.error(e.message);
  } finally {
    await browser.close();
  }
})();
