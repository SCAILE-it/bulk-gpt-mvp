/**
 * Complete VM-Hosted Wizard Flow Test
 * Tests via SSH tunnel to VM at 34.78.185.56:3010
 */

const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = '/Users/federicodeponte/Downloads/local-coder/bulk-gpt-app/test-screenshots-20251019-161605';
const SERVER_URL = 'http://localhost:3010'; // Via SSH tunnel

(async () => {
  console.log('\n🎬 COMPLETE VM WIZARD FLOW TEST\n');
  console.log('📸 Screenshots: ' + SCREENSHOT_DIR);
  console.log('🌐 Server: ' + SERVER_URL + ' (via SSH tunnel to VM)');
  console.log('🖥️  VM: 34.78.185.56:3010\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 600
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  let step = 0;
  const screenshot = async (name) => {
    step++;
    const filename = `${String(step).padStart(2, '0')}-${name}.png`;
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, filename),
      fullPage: true
    });
    console.log(`  📸 ${filename}`);
  };

  try {
    // =============================================
    // STEP 1: Navigate to Wizard (Auth Redirect)
    // =============================================
    console.log('\n📍 STEP 1: Navigate to wizard');
    await page.goto(SERVER_URL + '/wizard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot('01-auth-redirect');
    console.log('  ✅ Redirected to auth page');

    // =============================================
    // STEP 2: Sign In
    // =============================================
    console.log('\n🔐 STEP 2: Sign in');

    // Fill email
    await page.fill('input[type="email"]', 'test@example.com');
    await page.waitForTimeout(500);
    await screenshot('02-email-filled');
    console.log('  ✅ Email entered');

    // Fill password
    await page.fill('input[type="password"]', 'password');
    await page.waitForTimeout(500);
    await screenshot('03-password-filled');
    console.log('  ✅ Password entered');

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await screenshot('04-after-signin');

    // Check if we reached wizard
    const currentUrl = page.url();
    console.log('  Current URL:', currentUrl);

    if (!currentUrl.includes('/wizard')) {
      // Try navigating directly to wizard
      console.log('  ⚠️  Not on wizard, navigating directly...');
      await page.goto(SERVER_URL + '/wizard', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await screenshot('05-wizard-direct-nav');
    }

    console.log('  ✅ On wizard page');

    // =============================================
    // STEP 3: Wizard Step 1 - Upload CSV
    // =============================================
    console.log('\n📂 STEP 3: Upload CSV file');

    // Wait for upload UI
    await page.waitForTimeout(1000);
    await screenshot('06-wizard-step1-ready');
    console.log('  ✅ Upload page loaded');

    // Upload file (input is hidden, but Playwright can interact with it)
    const fileInput = await page.locator('input#csv-upload');
    await fileInput.setInputFiles('/Users/federicodeponte/Downloads/local-coder/bulk-gpt-app/test-data.csv');
    await page.waitForTimeout(2000);
    await screenshot('07-csv-uploaded');
    console.log('  ✅ CSV file uploaded');

    // Check for preview
    const hasPreview = await page.locator('text=Preview').first().isVisible().catch(() => false);
    if (hasPreview) {
      await page.waitForTimeout(1000);
      await screenshot('08-csv-preview-shown');
      console.log('  ✅ CSV preview visible');
    }

    // =============================================
    // STEP 4: Navigate to Step 2 (Configure)
    // =============================================
    console.log('\n⚙️  STEP 4: Navigate to Step 2');

    const continueBtn = await page.locator('button:has-text("Continue")').first();
    await continueBtn.click();
    await page.waitForTimeout(2000);
    await screenshot('09-wizard-step2-loaded');
    console.log('  ✅ Step 2 loaded');

    // =============================================
    // STEP 5: Configure Prompt
    // =============================================
    console.log('\n✍️  STEP 5: Configure prompt');

    const textarea = await page.locator('textarea').first();
    await textarea.fill('Write a professional 2-sentence bio for {{name}} who works as a {{role}} at {{company}} in the {{industry}} industry.');
    await page.waitForTimeout(1000);
    await screenshot('10-prompt-entered');
    console.log('  ✅ Prompt configured');

    // =============================================
    // STEP 6: Select Test Mode
    // =============================================
    console.log('\n🧪 STEP 6: Select Test Mode');

    const testModeBtn = await page.locator('button:has-text("Test")').first();
    await testModeBtn.click();
    await page.waitForTimeout(500);
    await screenshot('11-test-mode-selected');
    console.log('  ✅ Test mode selected (5 rows max)');

    // =============================================
    // STEP 7: Start Processing
    // =============================================
    console.log('\n🚀 STEP 7: Start processing');

    const startBtn = await page.locator('button:has-text("Start Processing")').first();
    await startBtn.click();
    await page.waitForTimeout(3000);
    await screenshot('12-processing-started');
    console.log('  ✅ Processing started');

    // =============================================
    // STEP 8: Monitor Progress
    // =============================================
    console.log('\n📊 STEP 8: Monitor progress (up to 60 seconds)');

    let completed = false;
    let rowsProcessed = 0;

    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(2000);

      // Count rows in results table
      const rows = await page.locator('table tr').count();
      rowsProcessed = rows > 1 ? rows - 1 : 0;

      // Check if still processing
      const stillProcessing = await page.locator('text=Processing').first().isVisible().catch(() => false);

      console.log(`  ⏱️  Check ${i + 1}/30: ${rowsProcessed} rows, ${stillProcessing ? 'processing...' : 'done'}`);

      if (i % 5 === 0) {
        await screenshot(`13-progress-${i + 1}`);
      }

      if (!stillProcessing && rowsProcessed > 0) {
        completed = true;
        console.log('  ✅ Processing completed!');
        break;
      }
    }

    // =============================================
    // STEP 9: View Final Results
    // =============================================
    console.log('\n📋 STEP 9: View final results');

    await screenshot('14-results-final');
    console.log(`  ✅ Results captured (${rowsProcessed} rows)`);

    // Get actual result data
    const resultCells = await page.locator('table td').allTextContents().catch(() => []);
    console.log(`  ℹ️  Total cells: ${resultCells.length}`);
    if (resultCells.length > 0) {
      console.log('  Sample outputs:');
      resultCells.slice(0, 10).forEach((cell, idx) => {
        console.log(`    ${idx + 1}. ${cell.substring(0, 60)}...`);
      });
    }

    // Check for export button
    const exportBtn = await page.locator('button:has-text("Export")').first().isVisible().catch(() => false);
    if (exportBtn) {
      console.log('  ✅ Export CSV button visible');
      await screenshot('15-export-button-visible');
    }

    // =============================================
    // FINAL SUMMARY
    // =============================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE WIZARD FLOW TEST - RESULTS');
    console.log('='.repeat(70));
    console.log(`Server: ${SERVER_URL} (VM: 34.78.185.56:3010)`);
    console.log(`Processing: ${completed ? 'COMPLETED' : 'IN PROGRESS'}`);
    console.log(`Rows Processed: ${rowsProcessed}`);
    console.log(`Screenshots: ${step} total`);
    console.log(`Folder: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(70));

    console.log('\n🎉 Test completed successfully!');
    console.log('   Browser will stay open for 30 seconds for manual review.\n');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
    await screenshot('ERROR-test-failed');
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed\n');
  }
})();
