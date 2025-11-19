import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set a reasonable viewport size for desktop
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    // Navigate to the RUN page with a shorter timeout
    await page.goto('http://localhost:3000/agents/bulk', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    
    // Wait a moment for rendering
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/run-page-screenshot.png', fullPage: false });
    console.log('Screenshot saved to /tmp/run-page-screenshot.png');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
