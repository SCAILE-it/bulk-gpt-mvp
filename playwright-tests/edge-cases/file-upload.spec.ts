/**
 * ABOUTME: Edge case tests for file upload validation
 * ABOUTME: Tests MAX_FILE_SIZE (10MB), row limits (1000), file types, empty files
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bulk');
    await page.waitForLoadState('networkidle');
  });

  test('should accept CSV file at exactly 10MB limit', async ({ page }) => {
    console.log('🧪 TEST: 10MB CSV file (at limit - should ACCEPT)');

    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-10mb-exact.csv');
    const fileInput = page.locator('[data-testid="file-input"]');

    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000); // Wait for file processing

    // Verify file was accepted (row count should be displayed)
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).toBeVisible({ timeout: 10000 });

    const rowCountText = await rowCount.textContent();
    console.log(`   ✅ File accepted: ${rowCountText}`);

    // Should NOT show error message
    const errorMessage = page.locator('text=/File is too large/i');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should reject CSV file over 10MB limit', async ({ page }) => {
    console.log('🧪 TEST: 10.1MB CSV file (over limit - should REJECT)');

    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-10.1mb-over.csv');
    const fileInput = page.locator('[data-testid="file-input"]');

    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    // Verify error message appears
    const errorMessage = page.locator('text=/File is too large.*Maximum size is 10MB/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    const errorText = await errorMessage.textContent();
    console.log(`   ✅ Error shown: ${errorText}`);

    // Row count should NOT be displayed
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).not.toBeVisible();
  });

  test('should reject empty CSV file', async ({ page }) => {
    console.log('🧪 TEST: Empty file (0 bytes - should REJECT)');

    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-empty.csv');
    const fileInput = page.locator('[data-testid="file-input"]');

    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    // Verify error message for empty file
    const errorMessage = page.locator('text=/is empty.*0 bytes/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    const errorText = await errorMessage.textContent();
    console.log(`   ✅ Error shown: ${errorText}`);

    // Row count should NOT be displayed
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).not.toBeVisible();
  });

  test('should reject non-CSV file (txt file)', async ({ page }) => {
    console.log('🧪 TEST: Non-CSV file (.txt - should REJECT)');

    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-not-csv.txt');
    const fileInput = page.locator('[data-testid="file-input"]');

    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    // Verify error message for wrong file type
    const errorMessage = page.locator('text=/File type not supported.*Please upload a CSV file/i');
    await expect(errorMessage).toBeVisible({ timeout: 8000 });

    const errorText = await errorMessage.textContent();
    console.log(`   ✅ Error shown: ${errorText}`);

    // Row count should NOT be displayed
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).not.toBeVisible();
  });

  test('should accept CSV with exactly 1,000 rows (at limit)', async ({ page }) => {
    console.log('🧪 TEST: 1,000 row CSV (at limit - should ACCEPT)');

    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-1000-rows.csv');
    const fileInput = page.locator('[data-testid="file-input"]');

    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    // Verify file was accepted and shows 1,000 rows
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).toBeVisible();

    const rowCountText = await rowCount.textContent();
    console.log(`   ✅ File accepted: ${rowCountText}`);

    // Should show "1,000 rows" or "1000 rows"
    expect(rowCountText).toMatch(/1[,]?000 rows/i);

    // Should NOT show row limit error
    const errorMessage = page.locator('text=/too many rows.*limited to 1,?000 rows/i');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should reject CSV with 1,001 rows (over limit)', async ({ page }) => {
    console.log('🧪 TEST: 1,001 row CSV (over limit - should REJECT)');

    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-1001-rows.csv');
    const fileInput = page.locator('[data-testid="file-input"]');

    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    // Verify error message for too many rows
    const errorMessage = page.locator('text=/too many rows.*limited to 1,?000 rows/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    const errorText = await errorMessage.textContent();
    console.log(`   ✅ Error shown: ${errorText}`);

    // Row count should NOT be displayed (file rejected)
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).not.toBeVisible();
  });
});
