const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const screenshotDir = path.join(__dirname, 'screenshots-wizard');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('📸 Capturing Wizard Screenshots...\n');

  try {
    await page.goto('http://localhost:3000/wizard', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Current URL:', page.url());

    if (page.url().includes('/auth')) {
      console.log('✅ Wizard requires authentication');
      await page.screenshot({ 
        path: path.join(screenshotDir, 'wizard-01-auth-required.png'), 
        fullPage: true 
      });
      console.log('   Saved: wizard-01-auth-required.png');
    } else {
      console.log('✅ On wizard page - capturing screenshots');
      
      await page.screenshot({ 
        path: path.join(screenshotDir, 'wizard-02-step1-upload.png'), 
        fullPage: true 
      });
      console.log('   Saved: wizard-02-step1-upload.png');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Done');
  }
})();
