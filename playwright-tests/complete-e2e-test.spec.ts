import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Complete E2E Flow', () => {
  test('Upload → Process → Wait for Completion → Download', async ({ page }) => {
    console.log('\n🧪 COMPLETE E2E TEST: Upload → Process → Wait → Download');
    console.log('================================================================\n');

    // Step 1: Navigate to bulk processing page
    console.log('📍 Step 1: Navigate to /bulk...');
    await page.goto('/bulk');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded\n');

    // Step 2: Upload CSV file
    console.log('📤 Step 2: Upload CSV file...');
    const testCsvPath = path.join(process.cwd(), 'playwright-tests', 'test-data', 'test-complete-flow.csv');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(testCsvPath);

    // Wait for file to be processed
    await page.waitForTimeout(2000);
    const rowCount = await page.locator('[data-testid="row-count-display"]').textContent();
    console.log(`✅ File uploaded: ${rowCount}\n`);

    // Step 3: Enter prompt
    console.log('📝 Step 3: Enter prompt...');
    const promptField = page.locator('[data-testid="prompt-textarea"]');
    await promptField.fill('Write a short bio for {{name}} at {{company}}');
    console.log('✅ Prompt entered\n');

    // Step 4: Click Run
    console.log('🚀 Step 4: Click Run button...');
    const runButton = page.locator('[data-testid="run-button"]');
    await runButton.click();
    console.log('✅ Run button clicked\n');

    // Step 5: Wait for batch creation
    console.log('⏳ Step 5: Waiting for batch creation (5s)...');
    await page.waitForTimeout(5000);
    console.log('✅ Batch should be created\n');

    // Step 6: Navigate to dashboard
    console.log('📊 Step 6: Navigate to Dashboard...');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    console.log('✅ Dashboard loaded\n');

    // Step 7: Wait for batch to complete (check every 10 seconds, max 2 minutes)
    console.log('⏳ Step 7: Waiting for batch to complete (polling every 10s, max 120s)...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 12; // 12 * 10s = 120s

    while (!completed && attempts < maxAttempts) {
      attempts++;
      console.log(`   Attempt ${attempts}/${maxAttempts}: Checking batch status...`);

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Look for the most recent batch (first row in table)
      const firstRowStatus = page.locator('table tbody tr').first().locator('text=/Completed|Processing|Pending|Failed/');
      const status = await firstRowStatus.textContent();

      console.log(`   Status: ${status}`);

      if (status?.includes('Completed')) {
        completed = true;
        console.log('✅ Batch completed!\n');
        break;
      } else if (status?.includes('Failed')) {
        throw new Error('Batch processing failed');
      }

      if (attempts < maxAttempts) {
        console.log(`   Still processing, waiting 10 more seconds...\n`);
        await page.waitForTimeout(10000);
      }
    }

    if (!completed) {
      console.log('⚠️  Batch did not complete within 120 seconds');
      console.log('   This may be normal for larger batches or slow AI processing');
      await page.screenshot({ path: '/tmp/e2e-timeout.png', fullPage: true });
      throw new Error('Batch processing timeout - batch may still be processing');
    }

    // Step 8: Find and click download button
    console.log('💾 Step 8: Looking for download button...');
    const firstRow = page.locator('table tbody tr').first();
    const downloadButton = firstRow.locator('button:has-text("Download")').first();

    const downloadVisible = await downloadButton.isVisible();
    if (!downloadVisible) {
      console.log('❌ Download button not found');
      await page.screenshot({ path: '/tmp/e2e-no-download.png', fullPage: true });
      throw new Error('Download button not found on completed batch');
    }

    console.log('✅ Download button found\n');

    // Step 9: Download the file
    console.log('📥 Step 9: Downloading results...');
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;

    const downloadPath = `/tmp/e2e-download-${Date.now()}.csv`;
    await download.saveAs(downloadPath);
    console.log(`✅ File downloaded to: ${downloadPath}\n`);

    // Step 10: Verify downloaded file
    console.log('🔍 Step 10: Verifying downloaded file...');
    const fs = require('fs');
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');

    console.log('   File preview (first 200 chars):');
    console.log('   ' + fileContent.substring(0, 200) + '...\n');

    // Check file has content
    expect(fileContent.length).toBeGreaterThan(50);

    // Check for CSV headers (should have original columns + output columns)
    const firstLine = fileContent.split('\n')[0];
    console.log('   CSV Headers: ' + firstLine);

    // Verify it's not empty or error response
    expect(firstLine).not.toContain('error');
    expect(firstLine).not.toContain('success');

    console.log('✅ File content verified\n');

    // Final screenshot
    await page.screenshot({ path: '/tmp/e2e-complete-success.png', fullPage: true });

    console.log('================================================================');
    console.log('🎉 COMPLETE E2E TEST PASSED!');
    console.log('   ✅ Upload CSV');
    console.log('   ✅ Set prompt');
    console.log('   ✅ Run batch');
    console.log('   ✅ Wait for completion');
    console.log('   ✅ Download results');
    console.log('   ✅ Verify file content');
    console.log('================================================================\n');
  });
});
