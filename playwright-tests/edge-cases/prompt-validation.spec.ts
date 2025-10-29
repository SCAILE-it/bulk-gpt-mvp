/**
 * ABOUTME: Edge case tests for prompt validation
 * ABOUTME: Tests empty prompts, missing variables, variable-CSV column mismatches
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Prompt Validation Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bulk');
    await page.waitForLoadState('networkidle');

    // Upload valid CSV file for all tests
    const filePath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases', 'file-valid-3-rows.csv');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);

    // Verify file uploaded successfully
    const rowCount = page.locator('[data-testid="row-count-display"]');
    await expect(rowCount).toBeVisible();
    console.log('   📤 Uploaded file-valid-3-rows.csv (name, company, role columns)');
  });

  test('should reject empty prompt', async ({ page }) => {
    console.log('🧪 TEST: Empty prompt (should REJECT)');

    const promptField = page.locator('[data-testid="prompt-textarea"]');
    const runButton = page.locator('[data-testid="run-button"]');

    // Clear prompt field (leave it empty)
    await promptField.fill('');
    await page.waitForTimeout(500);

    // Run button should be disabled or clicking should show error
    const isDisabled = await runButton.isDisabled();

    if (isDisabled) {
      console.log('   ✅ Run button is disabled for empty prompt');
      expect(isDisabled).toBe(true);
    } else {
      // Try clicking - should show validation error
      await runButton.click();
      await page.waitForTimeout(1000);

      // Look for validation error message
      const errorMessage = page.locator('text=/Prompt.*required/i');
      await expect(errorMessage).toBeVisible({ timeout: 3000 });

      const errorText = await errorMessage.textContent();
      console.log(`   ✅ Error shown: ${errorText}`);
    }
  });

  test('should reject prompt with no variables', async ({ page }) => {
    console.log('🧪 TEST: Prompt with no variables (should REJECT)');

    const promptField = page.locator('[data-testid="prompt-textarea"]');
    const runButton = page.locator('[data-testid="run-button"]');

    // Enter prompt WITHOUT any {{variables}}
    await promptField.fill('Write a bio for this person');
    await page.waitForTimeout(500);

    // Run button should be disabled or clicking should show error
    const isDisabled = await runButton.isDisabled();

    // Button should be disabled (validation happens without error message display)
    console.log('   ✅ Run button is disabled for prompt without variables');
    expect(isDisabled).toBe(true);
  });

  test('should reject prompt with variables not in CSV', async ({ page }) => {
    console.log('🧪 TEST: Prompt with missing CSV variables (should REJECT)');

    const promptField = page.locator('[data-testid="prompt-textarea"]');
    const runButton = page.locator('[data-testid="run-button"]');

    // Enter prompt with variables that DON'T exist in CSV
    // CSV has: name, company, role
    // Prompt uses: name, location (location doesn't exist)
    await promptField.fill('Write a bio for {{name}} from {{location}}');
    await page.waitForTimeout(500);

    // Run button should be disabled or clicking should show error
    const isDisabled = await runButton.isDisabled();

    if (isDisabled) {
      console.log('   ✅ Run button is disabled for missing variables');
      expect(isDisabled).toBe(true);
    } else {
      // Try clicking - should show validation error
      await runButton.click();
      await page.waitForTimeout(1000);

      // Look for validation error about missing variable
      const errorMessage = page.locator('text=/Variable.*not found.*location/i');
      await expect(errorMessage).toBeVisible({ timeout: 3000 });

      const errorText = await errorMessage.textContent();
      console.log(`   ✅ Error shown: ${errorText}`);
    }
  });

  test('should accept prompt with all variables in CSV', async ({ page }) => {
    console.log('🧪 TEST: Valid prompt with matching variables (should ACCEPT)');

    const promptField = page.locator('[data-testid="prompt-textarea"]');
    const runButton = page.locator('[data-testid="run-button"]');

    // Enter VALID prompt with variables that exist in CSV
    // CSV has: name, company, role
    await promptField.fill('Write a bio for {{name}}, {{role}} at {{company}}');
    await page.waitForTimeout(500);

    // Run button should be ENABLED
    const isDisabled = await runButton.isDisabled();
    expect(isDisabled).toBe(false);
    console.log('   ✅ Run button is enabled for valid prompt with matching variables');

    // Verify no validation errors are shown
    const errorMessage = page.locator('text=/Variable.*not found/i');
    await expect(errorMessage).not.toBeVisible();
  });
});
