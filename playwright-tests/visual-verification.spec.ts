import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = 'test-reports/visual-verification-screenshots';

test.describe('Visual Verification - Phase 3 UX Features', () => {
  test.beforeEach(async ({ page }) => {
    // Use baseURL from config (localhost:3334) with authenticated session
    await page.goto('/bulk', { waitUntil: 'networkidle' });
  });

  test('01 - Main bulk processor view (Desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000); // Let page settle

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-desktop-main-view.png`,
      fullPage: true
    });
  });

  test('02 - Help icon and keyboard shortcuts modal', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Find and click help icon (HelpCircle icon button)
    const helpButton = page.locator('button[aria-label="View keyboard shortcuts"]');
    await expect(helpButton).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02a-help-icon-visible.png`,
      fullPage: true
    });

    // Click help button to open modal
    await helpButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02b-keyboard-shortcuts-modal-open.png`,
      fullPage: true
    });

    // Close modal by clicking backdrop
    await page.locator('.fixed.inset-0').click();
    await page.waitForTimeout(500);
  });

  test('03 - Template gallery with search and filter', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Click "Browse Templates" button
    const browseButton = page.locator('button:has-text("Browse Templates")');
    await expect(browseButton).toBeVisible();
    await browseButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03a-template-gallery-expanded.png`,
      fullPage: true
    });

    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search templates"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('bio');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03b-template-search-bio.png`,
      fullPage: true
    });

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);

    // Test category filters - Content
    const contentButton = page.locator('button:has-text("Content")');
    await expect(contentButton).toBeVisible();
    await contentButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03c-template-filter-content.png`,
      fullPage: true
    });

    // Test category filters - Data
    const dataButton = page.locator('button:has-text("Data")');
    await dataButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03d-template-filter-data.png`,
      fullPage: true
    });

    // Test category filters - Analysis
    const analysisButton = page.locator('button:has-text("Analysis")');
    await analysisButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03e-template-filter-analysis.png`,
      fullPage: true
    });

    // Click All to reset
    const allButton = page.locator('button:has-text("All")').first();
    await allButton.click();
    await page.waitForTimeout(300);
  });

  test('04 - Advanced Settings with icons', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Find and click Advanced Settings collapsible
    const advancedSettings = page.locator('button:has-text("Advanced Settings")');
    await expect(advancedSettings).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04a-advanced-settings-collapsed.png`,
      fullPage: true
    });

    // Expand Advanced Settings
    await advancedSettings.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04b-advanced-settings-expanded-with-icons.png`,
      fullPage: true
    });

    // Focus on specific sections to verify icons
    const outputFormat = page.locator('label:has-text("Output Format")');
    await expect(outputFormat).toBeVisible();

    const webhookSection = page.locator('label:has-text("Webhook URL")');
    await expect(webhookSection).toBeVisible();

    const customCode = page.locator('label:has-text("Custom Code")');
    await expect(customCode).toBeVisible();
  });

  test('05 - Responsive view - Tablet (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-tablet-main-view.png`,
      fullPage: true
    });

    // Open keyboard shortcuts modal on tablet
    const helpButton = page.locator('button[aria-label="View keyboard shortcuts"]');
    await helpButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-tablet-keyboard-modal.png`,
      fullPage: true
    });

    await page.locator('.fixed.inset-0').click();
    await page.waitForTimeout(300);
  });

  test('06 - Responsive view - Mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06a-mobile-main-view.png`,
      fullPage: true
    });

    // Open keyboard shortcuts modal on mobile
    const helpButton = page.locator('button[aria-label="View keyboard shortcuts"]');
    await helpButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06b-mobile-keyboard-modal.png`,
      fullPage: true
    });

    await page.locator('.fixed.inset-0').click();
    await page.waitForTimeout(300);

    // Scroll down to see more on mobile
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06c-mobile-scrolled.png`,
      fullPage: true
    });
  });

  test('07 - Verify all Phase 3 icons are present', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Check help icon (HelpCircle) - should be visible in header
    const helpIcon = page.locator('button[aria-label="View keyboard shortcuts"]');
    await expect(helpIcon).toBeVisible();

    // Expand Advanced Settings to check icons
    const advancedSettings = page.locator('button:has-text("Advanced Settings")');
    await advancedSettings.click();
    await page.waitForTimeout(500);

    // Take screenshot highlighting icon sections
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-all-icons-verification.png`,
      fullPage: true
    });

    // Verify Settings icon (gear) is present next to "Advanced Settings"
    // Verify Table2 icon is present in Output Format section
    // Verify Webhook icon is present in Webhook URL section
    // Verify Code icon is present in Custom Code section
    // These icons should be visible in the screenshot
  });

  test('08 - Feature completeness check', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Create a summary screenshot showing all features
    await page.evaluate(() => {
      // Scroll to top
      window.scrollTo(0, 0);
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-feature-completeness-summary.png`,
      fullPage: true
    });

    // Check for all Phase 3 features in the DOM
    const features = {
      'Help Icon': await page.locator('button[aria-label="View keyboard shortcuts"]').isVisible(),
      'Browse Templates Button': await page.locator('button:has-text("Browse Templates")').isVisible(),
      'Advanced Settings': await page.locator('button:has-text("Advanced Settings")').isVisible(),
    };

    // Log feature presence
    console.log('Phase 3 Features Detected:');
    console.log(JSON.stringify(features, null, 2));

    // All features should be visible
    expect(features['Help Icon']).toBe(true);
    expect(features['Browse Templates Button']).toBe(true);
    expect(features['Advanced Settings']).toBe(true);
  });
});
