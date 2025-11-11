#!/usr/bin/env node

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

console.log('\n🧪 Testing JSON Formatting on Production\n');
console.log('='.repeat(60));

// Create screenshots directory
await mkdir('screenshots/json-formatting-production', { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

console.log('\n📱 Navigating to production...');

// Navigate to production app - use Vercel deployment URL
await page.goto('https://bulk-gpt-rjuhi0qjn-federicodepontes-projects.vercel.app/bulk', { waitUntil: 'networkidle', timeout: 60000 });

console.log('✅ Loaded production page');

// Screenshot 1: Initial page load
await page.screenshot({
  path: 'screenshots/json-formatting-production/01-page-loaded.png',
  fullPage: true
});

console.log('📸 Screenshot 1: Page loaded');

// Wait for results table
await page.waitForTimeout(3000);

// Check if results table exists
const hasResultsTable = await page.locator('table tbody tr').count() > 0;

if (hasResultsTable) {
  console.log('\n✅ Results table found');

  // Get all result rows
  const rows = await page.locator('table tbody tr').all();
  console.log(`  Found ${rows.length} rows`);

  // Screenshot 2: Results table
  await page.screenshot({
    path: 'screenshots/json-formatting-production/02-results-table.png',
    fullPage: true
  });

  console.log('📸 Screenshot 2: Results table');

  // Check first 3 rows for JSON formatting
  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i];
    const cells = await row.locator('td').all();

    if (cells.length > 0) {
      const lastCell = cells[cells.length - 1];
      const cellText = await lastCell.textContent();

      console.log(`\nRow ${i + 1}:`);
      console.log(`  Preview: ${cellText?.substring(0, 80)}...`);

      // Check for issues
      const hasRawJSON = cellText?.includes('{\"') || cellText?.includes('{"');
      const hasMarkdownBlocks = cellText?.includes('```');
      const hasCodeBlock = cellText?.includes('```json');

      // Positive checks
      const looksClean = cellText && cellText.length > 20 && !hasRawJSON && !hasMarkdownBlocks;

      if (hasRawJSON) {
        console.log('  ❌ FAIL: Contains raw JSON');
        failCount++;
      } else {
        console.log('  ✅ PASS: No raw JSON');
        passCount++;
      }

      if (hasMarkdownBlocks) {
        console.log('  ❌ FAIL: Contains markdown code blocks');
        failCount++;
      } else {
        console.log('  ✅ PASS: No markdown blocks');
        passCount++;
      }

      if (looksClean) {
        console.log('  ✅ PASS: Output looks properly formatted');
        passCount++;
      }
    }
  }

  // Screenshot 3: Zoomed in on a row
  const firstOutputCell = await page.locator('table tbody tr:first-child td:last-child');
  await firstOutputCell.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'screenshots/json-formatting-production/03-output-cell-detail.png'
  });

  console.log('📸 Screenshot 3: Output cell detail');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`  Total Checks: ${passCount + failCount}`);
  console.log(`  ✅ Passed: ${passCount}`);
  console.log(`  ❌ Failed: ${failCount}`);

  if (failCount === 0) {
    console.log('\n✅ JSON FORMATTING TEST PASSED!');
    console.log('   All outputs are properly formatted');
  } else {
    console.log('\n⚠️  JSON FORMATTING ISSUES DETECTED');
    console.log('   Some outputs still show raw JSON or markdown blocks');
  }

} else {
  console.log('\n⚠️  No results table found on page');
  console.log('   This may mean no batch data is currently loaded');

  // Take screenshot anyway
  await page.screenshot({
    path: 'screenshots/json-formatting-production/no-results.png',
    fullPage: true
  });
}

console.log('\n📁 Screenshots saved to: screenshots/json-formatting-production/');
console.log('\n' + '='.repeat(60) + '\n');

await browser.close();
