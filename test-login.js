const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  try {
    console.log('🔐 Navigating to http://localhost:5005...');
    await page.goto('http://localhost:5005', { waitUntil: 'domcontentloaded', timeout: 15000 });

    console.log(`Current URL: ${page.url()}`);

    // Should redirect to /auth
    if (page.url().includes('/auth')) {
      console.log('✓ Redirected to auth page');

      // Fill in credentials
      console.log('📝 Filling in credentials...');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password');

      console.log('🔘 Clicking sign in button...');
      await page.click('button:has-text("Sign in")');

      // Wait for navigation
      console.log('⏳ Waiting for redirect...');
      await page.waitForTimeout(3000);

      console.log(`Final URL: ${page.url()}`);

      // Take screenshot
      await page.screenshot({ path: 'login-result.png', fullPage: true });
      console.log('📸 Screenshot saved to login-result.png');

      // Check if we're logged in
      const bodyText = await page.locator('body').innerText();
      if (bodyText.includes('Bulk GPT')) {
        console.log('✅ Successfully logged in!');
      } else {
        console.log('❌ Login may have failed');
        console.log('Page text:', bodyText.substring(0, 200));
      }
    }

    console.log('\n🎉 Browser window will stay open. Close it manually when done.');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error.png', fullPage: true });
  }
})();
