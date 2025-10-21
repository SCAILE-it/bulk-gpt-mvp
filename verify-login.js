const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  try {
    console.log('🔐 Navigating to http://localhost:5005...');
    await page.goto('http://localhost:5005', { waitUntil: 'domcontentloaded', timeout: 15000 });

    console.log(`Current URL: ${page.url()}`);

    // Fill credentials
    console.log('📝 Filling credentials test@example.com / password...');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');

    console.log('🔘 Clicking Sign in...');
    await page.click('button:has-text("Sign in")');

    // Wait for navigation or error
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    console.log(`Post-login URL: ${currentUrl}`);

    // Check for error message
    const errorMsg = await page.locator('text=Invalid login credentials').count();
    if (errorMsg > 0) {
      console.log('❌ Login failed - Invalid credentials');
      await page.screenshot({ path: 'login-failed.png', fullPage: true });
      await browser.close();
      process.exit(1);
    }

    // Check if we're on the main page (not /auth)
    if (currentUrl.includes('/auth')) {
      console.log('❌ Still on auth page - login failed');
      await page.screenshot({ path: 'still-on-auth.png', fullPage: true });
      await browser.close();
      process.exit(1);
    }

    // Check for Bulk GPT title
    const h1Count = await page.locator('h1:has-text("Bulk GPT")').count();
    if (h1Count === 0) {
      console.log('❌ Bulk GPT title not found - not logged in');
      await page.screenshot({ path: 'no-title.png', fullPage: true });
      await browser.close();
      process.exit(1);
    }

    console.log('✅ LOGIN SUCCESSFUL!');
    console.log('📸 Taking screenshot of logged-in state...');
    await page.screenshot({ path: 'logged-in-success.png', fullPage: true });

    // Verify my changes are visible
    const outputColumns = await page.locator('text=Output Columns').count();
    const emptyState = await page.locator('text=Get started in 3 steps').count();

    console.log('\n=== MY CHANGES VERIFICATION ===');
    console.log(`✓ Output Columns section: ${outputColumns > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`✓ Empty state help: ${emptyState > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);

    console.log('\n🎉 Browser is now logged in and ready!');
    console.log('Check the screenshot: logged-in-success.png');
    console.log('\n👉 Browser window will stay open - close it when done.\n');

    // Keep browser open for user
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error.png', fullPage: true });
    await browser.close();
    process.exit(1);
  }
})();
