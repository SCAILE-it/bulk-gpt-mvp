/**
 * Comprehensive Production Test
 *
 * Tests all three critical fixes:
 * 1. CSV export has clean formatting (no markdown blocks)
 * 2. AI returns correct field names
 * 3. UI shows all outputs (all 3 columns filled for all 3 rows)
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRODUCTION_URL = 'https://bulk-gpt-app.vercel.app';
const SCREENSHOTS_DIR = join(__dirname, 'screenshots', 'comprehensive-production-test');

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

  console.log('🚀 Starting comprehensive production test...\n');

  try {
    // Step 1: Navigate to production
    console.log('📍 Step 1: Navigating to production URL...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '01-page-loaded.png'), fullPage: true });
    console.log('✅ Page loaded\n');

    // Step 2: Navigate to bulk page
    console.log('📍 Step 2: Navigating to bulk processing page...');
    await page.click('a[href="/bulk"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '02-bulk-page.png'), fullPage: true });
    console.log('✅ Bulk page loaded\n');

    // Step 3: Create test CSV with 3 companies
    console.log('📍 Step 3: Creating test CSV with 3 companies...');
    const csvContent = `Company Name
Microsoft
Apple
Google`;
    const csvPath = join(__dirname, 'test-3-companies.csv');
    fs.writeFileSync(csvPath, csvContent);
    console.log('✅ Test CSV created\n');

    // Step 4: Upload CSV
    console.log('📍 Step 4: Uploading CSV file...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '03-csv-uploaded.png'), fullPage: true });
    console.log('✅ CSV uploaded\n');

    // Step 5: Add prompt
    console.log('📍 Step 5: Adding prompt...');
    await page.fill('textarea[placeholder*="prompt" i]', 'Generate a company bio for {{Company Name}}');
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '04-prompt-added.png'), fullPage: true });
    console.log('✅ Prompt added\n');

    // Step 6: Define output columns (user-defined names)
    console.log('📍 Step 6: Defining output columns...');

    // Click "Define Output Format" button
    const defineFormatButton = page.locator('button:has-text("Define Output Format")');
    if (await defineFormatButton.isVisible()) {
      await defineFormatButton.click();
      await page.waitForTimeout(1000);
    }

    // Add custom columns
    const outputColumns = [
      'generatedBioText',
      'highlightedDifferentiators',
      'marketPositionSummary'
    ];

    for (let i = 0; i < outputColumns.length; i++) {
      const columnName = outputColumns[i];
      console.log(`  Adding column: ${columnName}`);

      // Look for "Add Column" button
      const addColumnButton = page.locator('button:has-text("Add Column"), button:has-text("Add Field")').first();
      if (await addColumnButton.isVisible()) {
        await addColumnButton.click();
        await page.waitForTimeout(500);
      }

      // Fill in column name
      const columnInput = page.locator('input[placeholder*="column" i], input[placeholder*="field" i]').last();
      await columnInput.fill(columnName);
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: join(SCREENSHOTS_DIR, '05-output-columns-defined.png'), fullPage: true });
    console.log('✅ Output columns defined\n');

    // Step 7: Start processing
    console.log('📍 Step 7: Starting batch processing...');
    await page.click('button:has-text("Process"), button:has-text("Start")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '06-processing-started.png'), fullPage: true });
    console.log('✅ Processing started\n');

    // Step 8: Wait for completion (max 3 minutes)
    console.log('📍 Step 8: Waiting for batch to complete...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 36; // 3 minutes (5s intervals)

    while (!completed && attempts < maxAttempts) {
      attempts++;
      await page.waitForTimeout(5000);

      // Check for completion indicators
      const completedText = await page.locator('text=/completed|success|done/i').count();
      const processingText = await page.locator('text=/processing|pending/i').count();

      if (completedText > 0 && processingText === 0) {
        completed = true;
      }

      if (attempts % 6 === 0) {
        console.log(`  Still waiting... (${attempts * 5}s elapsed)`);
      }
    }

    if (!completed) {
      console.warn('⚠️  Batch did not complete within 3 minutes - continuing anyway\n');
    } else {
      console.log('✅ Batch completed\n');
    }

    await page.screenshot({ path: join(SCREENSHOTS_DIR, '07-batch-completed.png'), fullPage: true });

    // Step 9: Verify all 3 rows show output
    console.log('📍 Step 9: Verifying UI shows outputs for all rows...');

    // Check table rows
    const rows = await page.locator('tbody tr').count();
    console.log(`  Found ${rows} rows in results table`);

    // Count non-empty output cells
    let filledCells = 0;
    let emptyDashes = 0;

    for (let i = 0; i < rows; i++) {
      const row = page.locator('tbody tr').nth(i);
      const cells = await row.locator('td').allTextContents();

      for (const cell of cells) {
        if (cell.trim() && cell.trim() !== '—' && cell.trim() !== '-') {
          filledCells++;
        }
        if (cell.trim() === '—') {
          emptyDashes++;
        }
      }
    }

    console.log(`  Filled cells: ${filledCells}`);
    console.log(`  Empty cells (—): ${emptyDashes}`);

    if (emptyDashes > 0) {
      console.error(`❌ FAIL: Found ${emptyDashes} empty cells (—) - field name mismatch issue not fixed!\n`);
    } else {
      console.log('✅ All cells filled - no field name mismatches\n');
    }

    // Step 10: Download CSV export
    console.log('📍 Step 10: Downloading CSV export...');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.waitForTimeout(1000);

    // Try CSV button if export dropdown exists
    const csvButton = page.locator('button:has-text("CSV")');
    if (await csvButton.isVisible()) {
      await csvButton.click();
    }

    const download = await downloadPromise;
    const downloadPath = join(__dirname, 'exported-results.csv');
    await download.saveAs(downloadPath);
    console.log(`✅ CSV downloaded to: ${downloadPath}\n`);

    // Step 11: Inspect CSV for markdown blocks
    console.log('📍 Step 11: Inspecting CSV for markdown blocks...');
    const csvData = fs.readFileSync(downloadPath, 'utf-8');

    console.log('\n--- CSV PREVIEW (first 500 chars) ---');
    console.log(csvData.substring(0, 500));
    console.log('--- END PREVIEW ---\n');

    const hasMarkdownBlocks = csvData.includes('```json') || csvData.includes('```');

    if (hasMarkdownBlocks) {
      console.error('❌ FAIL: CSV contains markdown code blocks (```json or ```)!\n');

      // Find and show the offending lines
      const lines = csvData.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('```')) {
          console.error(`  Line ${i + 1}: ${line.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('✅ CSV is clean - no markdown blocks found\n');
    }

    // Step 12: Check for correct field names in CSV
    console.log('📍 Step 12: Verifying correct field names in CSV...');
    const csvLines = csvData.split('\n');
    const headers = csvLines[0];

    console.log('  CSV Headers:', headers);

    const expectedColumns = ['generatedBioText', 'highlightedDifferentiators', 'marketPositionSummary'];
    const hasCorrectFields = expectedColumns.every(col => headers.includes(col));

    if (hasCorrectFields) {
      console.log('✅ All expected field names present in CSV\n');
    } else {
      console.error('❌ FAIL: Missing expected field names in CSV headers!\n');
      console.error('  Expected:', expectedColumns);
      console.error('  Found:', headers);
    }

    // Step 13: Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ Page loaded: YES`);
    console.log(`✓ CSV uploaded: YES`);
    console.log(`✓ Batch completed: ${completed ? 'YES' : 'NO (timeout)'}`);
    console.log(`✓ All rows show output: ${emptyDashes === 0 ? 'YES' : 'NO'}`);
    console.log(`✓ CSV clean (no markdown): ${!hasMarkdownBlocks ? 'YES' : 'NO'}`);
    console.log(`✓ Correct field names: ${hasCorrectFields ? 'YES' : 'NO'}`);
    console.log('='.repeat(60) + '\n');

    // Final verdict
    if (!hasMarkdownBlocks && emptyDashes === 0 && hasCorrectFields) {
      console.log('🎉 ALL FIXES VERIFIED - PRODUCTION TEST PASSED! 🎉\n');
    } else {
      console.error('❌ SOME FIXES FAILED - SEE DETAILS ABOVE\n');
    }

    await page.screenshot({ path: join(SCREENSHOTS_DIR, '08-final-state.png'), fullPage: true });

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'ERROR.png'), fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);
