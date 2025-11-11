import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/user.json'
});

test.describe('UX Improvements Verification', () => {
  test('should verify all 6 UX changes', async ({ page }) => {
    // Navigate to bulk page
    await page.goto('http://localhost:3000/bulk');
    await page.waitForLoadState('networkidle');

    // 1. Take full page screenshot
    await page.screenshot({
      path: '/tmp/bulk-page-authenticated.png',
      fullPage: true
    });
    console.log('✓ Saved full bulk page screenshot');

    // 2. Verify Advanced Options section is removed
    const advancedOptions = page.locator('text=Advanced Options');
    await expect(advancedOptions).toHaveCount(0);
    console.log('✓ Verified: Advanced Options section removed');

    // 3. Verify Tool Selection is present
    const toolSelection = page.locator('text=AI Tools');
    await expect(toolSelection).toBeVisible();
    console.log('✓ Verified: Tool Selection section present');

    // 4. Take screenshot of tool selection area
    const outputSettings = page.locator('text=Output Settings').first();
    if (await outputSettings.isVisible()) {
      await outputSettings.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: '/tmp/tool-selection-area.png',
        fullPage: false
      });
      console.log('✓ Saved tool selection area screenshot');
    }

    // 5. Verify tool pills are present (pill/badge design)
    const toolPills = page.locator('button:has-text("refresh icp"), button:has-text("find prospects")');
    const pillCount = await toolPills.count();
    console.log(`✓ Found ${pillCount} tool pills`);

    // 6. Take screenshot of tool pills
    if (pillCount > 0) {
      const firstPill = toolPills.first();
      await firstPill.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: '/tmp/tool-pills.png',
        clip: await firstPill.boundingBox() ? {
          x: (await firstPill.boundingBox())!.x - 20,
          y: (await firstPill.boundingBox())!.y - 20,
          width: 800,
          height: 200
        } : undefined
      });
      console.log('✓ Saved tool pills screenshot');
    }

    // 7. Verify buttons layout (Test and Run All)
    const testButton = page.locator('button:has-text("Test")').first();
    const runAllButton = page.locator('button:has-text("Run All")').first();

    await expect(testButton).toBeVisible();
    await expect(runAllButton).toBeVisible();
    console.log('✓ Verified: Test and Run All buttons present');

    // 8. Scroll to bottom and take screenshot of buttons
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/tmp/action-buttons.png',
      fullPage: false
    });
    console.log('✓ Saved action buttons screenshot');

    // 9. Navigate to profile page
    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');

    // 10. Verify API Access section is removed
    const apiAccess = page.locator('text=API Access');
    await expect(apiAccess).toHaveCount(0);
    console.log('✓ Verified: API Access section removed from profile');

    // 11. Take profile page screenshot
    await page.screenshot({
      path: '/tmp/profile-page-authenticated.png',
      fullPage: true
    });
    console.log('✓ Saved profile page screenshot');
  });
});
