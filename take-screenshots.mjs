import { chromium } from '@playwright/test';
import fs from 'fs';

const authState = JSON.parse(fs.readFileSync('playwright/.auth/user.json', 'utf-8'));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: authState
  });
  const page = await context.newPage();

  try {
    console.log('📸 Starting screenshot capture...\n');

    // 1. Navigate to bulk page
    console.log('🔄 Navigating to /bulk page...');
    await page.goto('http://localhost:3002/bulk', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 2. Full page screenshot
    await page.screenshot({
      path: '/tmp/bulk-page-full-authenticated.png',
      fullPage: true
    });
    console.log('✓ Saved: /tmp/bulk-page-full-authenticated.png');

    // 3. Check for Advanced Options (should NOT exist)
    const advancedOptions = await page.locator('text=Advanced Options').count();
    console.log(`\n🔍 Advanced Options found: ${advancedOptions} (expected: 0)`);

    // 4. Check for AI Tools (should exist)
    const aiTools = await page.locator('text=AI Tools').count();
    console.log(`🔍 AI Tools section found: ${aiTools} (expected: 1)`);

    // 5. Scroll to Output Settings to see tool selection
    try {
      await page.locator('text=Output Settings').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      // Screenshot of tool selection area
      await page.screenshot({
        path: '/tmp/output-settings-with-tools.png',
        fullPage: false
      });
      console.log('✓ Saved: /tmp/output-settings-with-tools.png');
    } catch (e) {
      console.log('⚠️  Could not scroll to Output Settings');
    }

    // 6. Look for tool pills
    const toolPills = await page.locator('button').filter({ hasText: /refresh icp|find prospects|enrich prospect/ }).count();
    console.log(`🔍 Tool pills found: ${toolPills}`);

    // 7. Take screenshot of a tool pill if found
    if (toolPills > 0) {
      const firstPill = page.locator('button').filter({ hasText: /refresh icp/ }).first();
      try {
        await firstPill.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        const box = await firstPill.boundingBox();
        if (box) {
          await page.screenshot({
            path: '/tmp/tool-pills-closeup.png',
            clip: {
              x: Math.max(0, box.x - 50),
              y: Math.max(0, box.y - 50),
              width: Math.min(1440, box.width + 600),
              height: Math.min(900, box.height + 200)
            }
          });
          console.log('✓ Saved: /tmp/tool-pills-closeup.png');
        }
      } catch (e) {
        console.log('⚠️  Could not capture tool pill closeup');
      }
    }

    // 8. Scroll to bottom to see action buttons
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: '/tmp/action-buttons-bottom.png',
      fullPage: false
    });
    console.log('✓ Saved: /tmp/action-buttons-bottom.png');

    // 9. Check button layout
    const testButton = await page.locator('button:has-text("Test")').first().count();
    const runAllButton = await page.locator('button:has-text("Run All")').first().count();
    console.log(`\n🔍 Test button found: ${testButton} (expected: 1)`);
    console.log(`🔍 Run All button found: ${runAllButton} (expected: 1)`);

    // 10. Navigate to profile page
    console.log('\n🔄 Navigating to /profile page...');
    await page.goto('http://localhost:3002/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 11. Check for API Access (should NOT exist)
    const apiAccess = await page.locator('text=API Access').count();
    console.log(`🔍 API Access section found: ${apiAccess} (expected: 0)`);

    // 12. Profile page screenshot
    await page.screenshot({
      path: '/tmp/profile-page-full-authenticated.png',
      fullPage: true
    });
    console.log('✓ Saved: /tmp/profile-page-full-authenticated.png');

    console.log('\n✅ All screenshots captured successfully!');
    console.log('\n📊 Verification Summary:');
    console.log(`  ✓ Advanced Options removed: ${advancedOptions === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ AI Tools present: ${aiTools > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Tool pills rendered: ${toolPills > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Buttons present: ${testButton > 0 && runAllButton > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ API Access removed: ${apiAccess === 0 ? 'PASS' : 'FAIL'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png' });
    console.log('Saved error screenshot to /tmp/error-screenshot.png');
  } finally {
    await browser.close();
  }
})();
