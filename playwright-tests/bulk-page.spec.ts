/**
 * Test for new single-page bulk processor
 */

import { test, expect } from '@playwright/test';

test('screenshot bulk processor page', async ({ page }) => {
  // Authenticate
  await page.goto('http://localhost:3334');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password');
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }),
    page.click('button:has-text("Sign in")')
  ]);

  // Navigate to /bulk
  await page.goto('http://localhost:3334/bulk');
  await page.waitForTimeout(2000); // Wait for render

  // Take screenshot
  await page.screenshot({ path: '/tmp/bulk-processor.png', fullPage: true });

  console.log('✅ Screenshot saved to /tmp/bulk-processor.png');
});
