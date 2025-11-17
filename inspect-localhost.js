const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({ path: 'localhost-screenshot.png', fullPage: true });
  console.log('Screenshot saved to localhost-screenshot.png');

  // Get page title
  const title = await page.title();
  console.log('Page title:', title);

  // Get main content
  const bodyText = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      h1: document.querySelector('h1')?.textContent,
      mainContent: document.querySelector('main')?.innerText?.slice(0, 500),
      bodyClasses: document.body.className
    };
  });

  console.log('\nPage Info:');
  console.log(JSON.stringify(bodyText, null, 2));

  // Keep browser open for inspection
  console.log('\nBrowser is open for inspection. Press Ctrl+C to close.');
})();
