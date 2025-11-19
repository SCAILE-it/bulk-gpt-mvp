import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set a reasonable viewport size for desktop
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    // Navigate to the RUN page
    await page.goto('http://localhost:3000/agents/bulk', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Wait a moment for rendering
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/run-page-screenshot.png', fullPage: false });
    console.log('Screenshot saved to /tmp/run-page-screenshot.png');
  } catch (error) {
    console.error('Error taking screenshot:', error.message);
  } finally {
    await browser.close();
  }
})();
