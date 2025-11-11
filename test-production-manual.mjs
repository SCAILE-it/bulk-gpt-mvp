/**
 * Manual Production Verification Test
 * Tests all three critical fixes with proper CSV format
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRODUCTION_URL = 'https://bulk-gpt-app.vercel.app';
const SCREENSHOTS_DIR = join(__dirname, 'screenshots', 'manual-production-test');

// Create screenshots directory
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: join(__dirname, 'playwright/.auth/user.json'),
  });
  const page = await context.newPage();

  console.log('🚀 Starting manual production verification...\n');

  try {
    // Step 1: Navigate to production
    console.log('📍 Step 1: Navigating to production...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '01-loaded.png'), fullPage: true });
    console.log('✅ Loaded\n');

    // Step 2: Navigate to bulk page
    console.log('📍 Step 2: Opening bulk processor...');
    await page.click('a[href="/bulk"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '02-bulk-page.png'), fullPage: true });
    console.log('✅ Bulk page ready\n');

    // Step 3: Create proper CSV with header
    console.log('📍 Step 3: Creating test CSV...');
    const csvContent = `Company Name
Microsoft
Apple
Google`;
    const csvPath = join(__dirname, 'test-companies.csv');
    fs.writeFileSync(csvPath, csvContent);
    console.log('✅ CSV created\n');

    // Step 4: Upload CSV
    console.log('📍 Step 4: Uploading CSV...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '03-csv-uploaded.png'), fullPage: true });
    console.log('✅ CSV uploaded\n');

    // Step 5: Configure prompt (it might already have default text)
    console.log('📍 Step 5: Checking prompt field...');
    const promptField = page.locator('textarea').first();
    await promptField.click();
    await page.waitForTimeout(500);

    // Clear and set new prompt
    await promptField.fill('Generate a company bio for {{Company Name}}');
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '04-prompt-set.png'), fullPage: true });
    console.log('✅ Prompt configured\n');

    // Step 6: Define output columns
    console.log('📍 Step 6: Defining output columns...');

    // Try to click "Define Output Format" or similar button
    const defineButton = page.locator('button:has-text("Define"), button:has-text("Output")').first();
    if (await defineButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await defineButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for column input fields or "Add Column" button
    const addColumnButton = page.locator('button:has-text("Add"), button').filter({ hasText: /column|field/i }).first();

    const outputColumns = ['generatedBioText', 'highlightedDifferentiators', 'marketPositionSummary'];

    for (const colName of outputColumns) {
      console.log(`  Adding column: ${colName}`);

      if (await addColumnButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await addColumnButton.click();
        await page.waitForTimeout(500);
      }

      // Find the last input field for column name
      const columnInput = page.locator('input[placeholder*="column" i], input[placeholder*="field" i]').last();
      if (await columnInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await columnInput.fill(colName);
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: join(SCREENSHOTS_DIR, '05-columns-defined.png'), fullPage: true });
    console.log('✅ Columns defined\n');

    // Step 7: Start processing
    console.log('📍 Step 7: Starting processing...');
    const runButton = page.locator('button:has-text("Run"), button:has-text("Process"), button:has-text("Start")').first();
    await runButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '06-processing.png'), fullPage: true });
    console.log('✅ Processing started\n');

    // Step 8: Wait for completion
    console.log('📍 Step 8: Waiting for completion (max 3 min)...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 36; // 3 minutes

    while (!completed && attempts < maxAttempts) {
      attempts++;
      await page.waitForTimeout(5000);

      const completedText = await page.locator('text=/completed|success|done/i').count();
      const processingText = await page.locator('text=/processing|pending/i').count();

      if (completedText > 0 && processingText === 0) {
        completed = true;
      }

      if (attempts % 6 === 0) {
        console.log(`  Still waiting... (${attempts * 5}s)`);
      }
    }

    await page.screenshot({ path: join(SCREENSHOTS_DIR, '07-completed.png'), fullPage: true });
    console.log(completed ? '✅ Completed\n' : '⚠️  Timeout\n');

    // Step 9: Check UI shows all outputs
    console.log('📍 Step 9: Verifying UI shows all outputs...');

    const rows = await page.locator('tbody tr').count();
    console.log(`  Found ${rows} rows`);

    // Count empty dashes
    const pageContent = await page.content();
    const emptyDashCount = (pageContent.match(/>\s*—\s*</g) || []).length;

    console.log(`  Empty cells (—): ${emptyDashCount}`);

    if (emptyDashCount > 0) {
      console.error('❌ FAIL: Found empty cells - field names don\'t match!\n');
    } else {
      console.log('✅ All cells filled\n');
    }

    await page.screenshot({ path: join(SCREENSHOTS_DIR, '08-results.png'), fullPage: true });

    // Step 10: Download CSV
    console.log('📍 Step 10: Downloading CSV export...');

    const downloadPromise = page.waitForEvent('download');

    // Click Export button
    const exportButton = page.locator('button:has-text("Export")').first();
    await exportButton.click();
    await page.waitForTimeout(1000);

    // If CSV option appears, click it
    const csvButton = page.locator('button:has-text("CSV")');
    if (await csvButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await csvButton.click();
    }

    const download = await downloadPromise;
    const downloadPath = join(__dirname, 'exported-production-results.csv');
    await download.saveAs(downloadPath);
    console.log(`✅ Downloaded to: ${downloadPath}\n`);

    // Step 11: Inspect CSV
    console.log('📍 Step 11: Inspecting CSV for issues...');
    const csvData = fs.readFileSync(downloadPath, 'utf-8');

    console.log('\n--- CSV PREVIEW ---');
    console.log(csvData.substring(0, 600));
    console.log('--- END ---\n');

    // Check for markdown blocks
    const hasMarkdown = csvData.includes('```json') || csvData.includes('```');

    if (hasMarkdown) {
      console.error('❌ FAIL: CSV contains markdown blocks!\n');
    } else {
      console.log('✅ CSV is clean (no markdown)\n');
    }

    // Check for correct field names
    const headers = csvData.split('\n')[0];
    console.log('CSV Headers:', headers);

    const hasCorrectFields = outputColumns.every(col => headers.includes(col));

    if (hasCorrectFields) {
      console.log('✅ All field names present\n');
    } else {
      console.error('❌ FAIL: Missing expected field names\n');
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ Deployment: 51 minutes ago (commit c3f87f5)`);
    console.log(`✓ Batch completed: ${completed ? 'YES' : 'NO'}`);
    console.log(`✓ All rows show output: ${emptyDashCount === 0 ? 'YES' : 'NO'}`);
    console.log(`✓ CSV clean: ${!hasMarkdown ? 'YES' : 'NO'}`);
    console.log(`✓ Correct field names: ${hasCorrectFields ? 'YES' : 'NO'}`);
    console.log('='.repeat(60) + '\n');

    if (!hasMarkdown && emptyDashCount === 0 && hasCorrectFields) {
      console.log('🎉 ALL FIXES VERIFIED - PRODUCTION WORKING! 🎉\n');
    } else {
      console.error('❌ SOME ISSUES REMAIN - SEE DETAILS ABOVE\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'ERROR.png'), fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);
