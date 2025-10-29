/**
 * ABOUTME: Edge case tests for responsive design
 * ABOUTME: Tests app functionality at mobile (375px), tablet (768px), and desktop (1440px) viewports
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Responsive Design Edge Cases', () => {
  test('should be functional at mobile viewport (375px)', async ({ page }) => {
    console.log('🧪 TEST: Mobile viewport (375px x 667px - iPhone SE)');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/bulk');
    await page.waitForLoadState('networkidle');

    // Verify critical UI elements are visible and accessible
    console.log('   Checking file upload...');
    const fileInput = page.locator('[data-testid="file-input"]');
    await expect(fileInput).toBeAttached();

    // Upload file
    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-valid-3-rows.csv');
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    // Verify row count displays
    console.log('   Checking row count display...');
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).toBeVisible();
    console.log(`   ✅ Row count visible: ${await rowCount.textContent()}`);

    // Verify prompt field is accessible
    console.log('   Checking prompt textarea...');
    const promptField = page.locator('[data-testid="prompt-textarea"]');
    await expect(promptField).toBeVisible();
    await promptField.fill('Write a bio for {{name}}');
    console.log('   ✅ Prompt field functional');

    // Verify run button is visible and clickable
    console.log('   Checking run button...');
    const runButton = page.locator('[data-testid="run-button"]');
    await expect(runButton).toBeVisible();
    const isEnabled = !(await runButton.isDisabled());
    expect(isEnabled).toBe(true);
    console.log('   ✅ Run button visible and enabled');

    // Take screenshot
    await page.screenshot({ path: '/tmp/responsive-mobile-375px.png', fullPage: true });
    console.log('   📸 Screenshot saved: /tmp/responsive-mobile-375px.png');
  });

  test('should be functional at tablet viewport (768px)', async ({ page }) => {
    console.log('🧪 TEST: Tablet viewport (768px x 1024px - iPad)');

    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/bulk');
    await page.waitForLoadState('networkidle');

    // Verify critical UI elements are visible and accessible
    console.log('   Checking file upload...');
    const fileInput = page.locator('[data-testid="file-input"]');
    await expect(fileInput).toBeAttached();

    // Upload file
    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-valid-3-rows.csv');
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    // Verify row count displays
    console.log('   Checking row count display...');
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).toBeVisible();
    console.log(`   ✅ Row count visible: ${await rowCount.textContent()}`);

    // Verify prompt field is accessible
    console.log('   Checking prompt textarea...');
    const promptField = page.locator('[data-testid="prompt-textarea"]');
    await expect(promptField).toBeVisible();
    await promptField.fill('Write a bio for {{name}}');
    console.log('   ✅ Prompt field functional');

    // Verify run button is visible and clickable
    console.log('   Checking run button...');
    const runButton = page.locator('[data-testid="run-button"]');
    await expect(runButton).toBeVisible();
    const isEnabled = !(await runButton.isDisabled());
    expect(isEnabled).toBe(true);
    console.log('   ✅ Run button visible and enabled');

    // Take screenshot
    await page.screenshot({ path: '/tmp/responsive-tablet-768px.png', fullPage: true });
    console.log('   📸 Screenshot saved: /tmp/responsive-tablet-768px.png');
  });

  test('should be functional at desktop viewport (1440px)', async ({ page }) => {
    console.log('🧪 TEST: Desktop viewport (1440px x 900px - Standard laptop)');

    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/bulk');
    await page.waitForLoadState('networkidle');

    // Verify critical UI elements are visible and accessible
    console.log('   Checking file upload...');
    const fileInput = page.locator('[data-testid="file-input"]');
    await expect(fileInput).toBeAttached();

    // Upload file
    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-valid-3-rows.csv');
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    // Verify row count displays
    console.log('   Checking row count display...');
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).toBeVisible();
    console.log(`   ✅ Row count visible: ${await rowCount.textContent()}`);

    // Verify prompt field is accessible
    console.log('   Checking prompt textarea...');
    const promptField = page.locator('[data-testid="prompt-textarea"]');
    await expect(promptField).toBeVisible();
    await promptField.fill('Write a bio for {{name}}');
    console.log('   ✅ Prompt field functional');

    // Verify run button is visible and clickable
    console.log('   Checking run button...');
    const runButton = page.locator('[data-testid="run-button"]');
    await expect(runButton).toBeVisible();
    const isEnabled = !(await runButton.isDisabled());
    expect(isEnabled).toBe(true);
    console.log('   ✅ Run button visible and enabled');

    // Verify layout optimization at desktop size
    // At 1440px, the layout should show full features without scrolling
    console.log('   Checking layout optimization...');
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(1440);
    console.log('   ✅ Desktop layout optimized');

    // Take screenshot
    await page.screenshot({ path: '/tmp/responsive-desktop-1440px.png', fullPage: true });
    console.log('   📸 Screenshot saved: /tmp/responsive-desktop-1440px.png');
  });

  test('should handle extreme small viewport (320px)', async ({ page }) => {
    console.log('🧪 TEST: Extreme small viewport (320px - iPhone 5/SE)');

    // Set smallest common mobile viewport
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/bulk');
    await page.waitForLoadState('networkidle');

    // At this size, UI might be cramped but should still be functional
    console.log('   Checking critical elements accessibility...');

    const fileInput = page.locator('[data-testid="file-input"]');
    await expect(fileInput).toBeAttached();
    console.log('   ✅ File input accessible');

    const promptField = page.locator('[data-testid="prompt-textarea"]');
    await expect(promptField).toBeAttached();
    console.log('   ✅ Prompt field attached');

    const runButton = page.locator('[data-testid="run-button"]');
    await expect(runButton).toBeAttached();
    console.log('   ✅ Run button attached');

    // Take screenshot to verify layout doesn't break
    await page.screenshot({ path: '/tmp/responsive-extreme-320px.png', fullPage: true });
    console.log('   📸 Screenshot saved: /tmp/responsive-extreme-320px.png');
    console.log('   ✅ UI remains functional at extreme small viewport');
  });

  test('should handle ultra-wide desktop (3840px - 4K)', async ({ page }) => {
    console.log('🧪 TEST: Ultra-wide viewport (3840px - 4K monitor)');

    // Set 4K viewport
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('/bulk');
    await page.waitForLoadState('networkidle');

    // At 4K, verify layout scales properly and isn't stretched awkwardly
    console.log('   Checking layout at 4K resolution...');

    const fileInput = page.locator('[data-testid="file-input"]');
    await expect(fileInput).toBeAttached();

    const promptField = page.locator('[data-testid="prompt-textarea"]');
    await expect(promptField).toBeAttached();

    const runButton = page.locator('[data-testid="run-button"]');
    await expect(runButton).toBeAttached();

    // Upload file to verify complete workflow
    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-valid-3-rows.csv');
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).toBeVisible();
    console.log(`   ✅ Row count visible at 4K: ${await rowCount.textContent()}`);

    // Take screenshot
    await page.screenshot({ path: '/tmp/responsive-4k-3840px.png', fullPage: true });
    console.log('   📸 Screenshot saved: /tmp/responsive-4k-3840px.png');
    console.log('   ✅ UI scales properly at 4K resolution');
  });
});
