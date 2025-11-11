import { chromium } from 'playwright';

async function testButtonVisibility() {
  const browser = await chromium.launch();

  // Test at two common laptop resolutions
  const viewports = [
    { width: 1366, height: 768, name: '1366x768 (HD laptop)' },
    { width: 1440, height: 900, name: '1440x900 (MacBook Air)' }
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      storageState: 'playwright/.auth/user.json'
    });
    const page = await context.newPage();

    console.log(`\n📱 Testing viewport: ${viewport.name}`);

    try {
      // Navigate to bulk processor page
      await page.goto('http://localhost:3000/bulk', { waitUntil: 'networkidle' });

      // Wait for the action buttons to be present
      await page.waitForSelector('button:has-text("Test")', { timeout: 10000 });
      await page.waitForSelector('button:has-text("Run All")', { timeout: 10000 });

      // Check if buttons are visible in viewport
      const testButton = page.locator('button:has-text("Test")');
      const runButton = page.locator('button:has-text("Run All")');

      const testButtonBox = await testButton.boundingBox();
      const runButtonBox = await runButton.boundingBox();

      if (!testButtonBox || !runButtonBox) {
        console.log(`   ❌ FAIL: Buttons not found`);
        continue;
      }

      // Check if buttons are within viewport height
      const testButtonVisible = testButtonBox.y + testButtonBox.height <= viewport.height;
      const runButtonVisible = runButtonBox.y + runButtonBox.height <= viewport.height;

      console.log(`   Test button position: y=${Math.round(testButtonBox.y)}, height=${Math.round(testButtonBox.height)}`);
      console.log(`   Run button position: y=${Math.round(runButtonBox.y)}, height=${Math.round(runButtonBox.height)}`);
      console.log(`   Viewport height: ${viewport.height}`);

      if (testButtonVisible && runButtonVisible) {
        console.log(`   ✅ PASS: Both buttons are fully visible`);
      } else {
        console.log(`   ❌ FAIL: Buttons are cut off`);
        if (!testButtonVisible) console.log(`      - Test button bottom at ${Math.round(testButtonBox.y + testButtonBox.height)} > ${viewport.height}`);
        if (!runButtonVisible) console.log(`      - Run button bottom at ${Math.round(runButtonBox.y + runButtonBox.height)} > ${viewport.height}`);
      }

      // Take screenshot
      const screenshotPath = `test-screenshots/button-visibility-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\n✅ Button visibility testing complete\n');
}

testButtonVisibility().catch(console.error);
