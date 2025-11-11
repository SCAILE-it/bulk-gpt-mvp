import { chromium } from 'playwright';

async function debugPage() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  try {
    console.log('Navigating to /bulk...');
    await page.goto('http://localhost:3000/bulk', { waitUntil: 'networkidle', timeout: 10000 });

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-screenshots/debug-initial.png', fullPage: true });
    console.log('Screenshot saved: test-screenshots/debug-initial.png');

    // Check what's on the page
    const title = await page.title();
    console.log('Page title:', title);

    const url = page.url();
    console.log('Current URL:', url);

    // Check if we got redirected to login
    if (url.includes('login') || url.includes('auth')) {
      console.log('❌ Page redirected to authentication');
    } else {
      console.log('✅ Page loaded without redirect');
    }

    // Check for error messages
    const bodyText = await page.locator('body').textContent();
    console.log('Page content length:', bodyText.length);

    if (bodyText.includes('Unauthorized') || bodyText.includes('Sign in')) {
      console.log('❌ Authentication required');
    }

  } catch (error) {
    console.log('Error:', error.message);
  }

  await browser.close();
}

debugPage().catch(console.error);
