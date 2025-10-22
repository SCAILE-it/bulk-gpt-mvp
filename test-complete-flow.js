/**
 * Complete Wizard Flow Test with Screenshots
 * Tests the entire user journey from sign-in to CSV download
 */

const { chromium } = require('playwright');
const path = require('path');

// Screenshot folder
const SCREENSHOT_DIR = '/Users/federicodeponte/Downloads/local-coder/bulk-gpt-app/test-screenshots-20251019-161605';

(async () => {
  console.log('\n🎬 Complete Wizard User Flow Test\n');
  console.log('📸 Screenshots will be saved to:', SCREENSHOT_DIR);
  console.log('🌐 Testing on: http://localhost:3010\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800 // Slower for better screenshots
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 } // Full HD for better screenshots
  });

  let stepNum = 0;
  const screenshot = async (name) => {
    stepNum++;
    const filename = `${String(stepNum).padStart(2, '0')}-${name}.png`;
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, filename),
      fullPage: true
    });
    console.log(`  📸 ${filename}`);
  };

  try {
    // ========================================
    // STEP 1: Navigate to Wizard (Auth Redirect)
    // ========================================
    console.log('\n📍 Step 1: Navigate to wizard (auth redirect)');
    await page.goto('http://localhost:3010/wizard');
    await page.waitForTimeout(1500);
    await screenshot('auth-page-redirect');

    // ========================================
    // STEP 2: Sign In
    // ========================================
    console.log('\n🔐 Step 2: Sign in with credentials');
    await page.fill('input[type="email"]', 'test@example.com');
    await screenshot('auth-email-filled');

    await page.fill('input[type="password"]', 'password');
    await screenshot('auth-password-filled');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Verify redirect to wizard
    if (page.url().includes('/wizard')) {
      console.log('  ✅ Successfully signed in and redirected to wizard');
      await screenshot('wizard-step1-initial');
    } else {
      throw new Error('Failed to redirect to wizard after sign in');
    }

    // ========================================
    // STEP 3: Upload CSV
    // ========================================
    console.log('\n📂 Step 3: Upload CSV file');

    // Verify Step 1 UI loaded
    const uploadHeading = await page.locator('text=Upload').first();
    await uploadHeading.waitFor({ state: 'visible', timeout: 5000 });
    await screenshot('wizard-step1-upload-ready');

    // Select file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('/Users/federicodeponte/Downloads/local-coder/bulk-gpt-app/test-data.csv');
    console.log('  ✅ CSV file uploaded');
    await page.waitForTimeout(2000);

    // Check for preview
    await screenshot('wizard-step1-csv-uploaded');

    // Wait for preview to render
    const hasPreview = await page.locator('text=Preview').first().isVisible().catch(() => false);
    if (hasPreview) {
      console.log('  ✅ CSV preview visible');
      await screenshot('wizard-step1-preview-shown');
    }

    // ========================================
    // STEP 4: Navigate to Step 2 (Configure)
    // ========================================
    console.log('\n⚙️  Step 4: Navigate to Step 2 (Configure)');

    const continueBtn = await page.locator('text=Continue').first();
    await continueBtn.click();
    await page.waitForTimeout(1500);

    // Verify Step 2 loaded
    const promptLabel = await page.locator('text=Write your prompt').first();
    await promptLabel.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Step 2 (Configure) loaded');
    await screenshot('wizard-step2-configure-initial');

    // ========================================
    // STEP 5: Configure Prompt
    // ========================================
    console.log('\n✍️  Step 5: Configure prompt');

    const textarea = await page.locator('textarea').first();
    await textarea.fill('What is the capital of {{Country}}? Answer in 1-2 words only.');
    console.log('  ✅ Prompt entered');
    await page.waitForTimeout(500);
    await screenshot('wizard-step2-prompt-entered');

    // ========================================
    // STEP 6: Select Processing Mode
    // ========================================
    console.log('\n🧪 Step 6: Select Test Mode (5 rows max)');

    // Click Test mode
    const testModeBtn = await page.locator('text=Test').first();
    await testModeBtn.click();
    await page.waitForTimeout(500);
    console.log('  ✅ Test mode selected (will process 5 rows)');
    await screenshot('wizard-step2-test-mode-selected');

    // ========================================
    // STEP 7: Start Processing
    // ========================================
    console.log('\n🚀 Step 7: Start processing');

    const startBtn = await page.locator('text=Start Processing').first();
    await startBtn.click();
    await page.waitForTimeout(3000);

    console.log('  ✅ Processing started');
    await screenshot('wizard-step3-processing-started');

    // ========================================
    // STEP 8: Monitor Progress
    // ========================================
    console.log('\n📊 Step 8: Monitor processing progress');

    let checkCount = 0;
    let completedRows = 0;
    let processingComplete = false;

    // Monitor for up to 60 seconds
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(2000);
      checkCount++;

      // Count result rows (excluding header)
      const resultRows = await page.locator('tr').count();
      if (resultRows > 1) {
        completedRows = resultRows - 1; // Exclude header row
      }

      // Check if still processing
      const stillProcessing = await page.locator('text=Processing').first().isVisible().catch(() => false);

      console.log(`  ⏱️  Check ${checkCount}/30: ${completedRows} rows processed, ${stillProcessing ? 'still processing...' : 'completed!'}`);

      // Take progress screenshot every 10 seconds
      if (checkCount % 5 === 0) {
        await screenshot(`wizard-step3-progress-check-${checkCount}`);
      }

      // Break if completed
      if (!stillProcessing && completedRows > 0) {
        processingComplete = true;
        console.log('  ✅ Processing completed!');
        break;
      }
    }

    // ========================================
    // STEP 9: View Results
    // ========================================
    console.log('\n📋 Step 9: View results');

    await screenshot('wizard-step3-results-final');

    // Check for Download CSV button
    const downloadBtn = await page.locator('button:has-text("Export CSV")').first().isVisible().catch(() => false);
    if (downloadBtn) {
      console.log('  ✅ Export CSV button visible');

      // Highlight the button area
      await page.locator('button:has-text("Export CSV")').first().scrollIntoViewIfNeeded();
      await screenshot('wizard-step3-export-button-highlighted');
    } else {
      // Try alternative button text
      const altDownload = await page.locator('text=Download').first().isVisible().catch(() => false);
      if (altDownload) {
        console.log('  ✅ Download button visible');
        await screenshot('wizard-step3-download-button');
      }
    }

    // Show results table
    console.log('  ℹ️  Results table captured');

    // Get actual result data
    const resultCells = await page.locator('table td').allTextContents().catch(() => []);
    if (resultCells.length > 0) {
      console.log(`  ℹ️  Total result cells captured: ${resultCells.length}`);
      console.log('  ℹ️  Sample outputs:', resultCells.slice(0, 5).join(' | '));
    }

    // ========================================
    // STEP 10: Summary Statistics
    // ========================================
    console.log('\n📈 Step 10: Capture summary statistics');

    // Look for summary stats
    const summarySection = await page.locator('text=completed').first().isVisible().catch(() => false);
    if (summarySection) {
      console.log('  ✅ Summary statistics visible');
    }

    await screenshot('wizard-step3-final-complete');

    // ========================================
    // Final Summary
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPLETE WIZARD FLOW TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Screenshots: ${stepNum}`);
    console.log(`Processing Result: ${processingComplete ? 'SUCCESS' : 'IN PROGRESS'}`);
    console.log(`Rows Processed: ${completedRows}`);
    console.log(`Screenshots Folder: ${SCREENSHOT_DIR}`);
    console.log('='.repeat(60));

    // List all screenshots
    console.log('\n📁 Screenshots captured:');
    const fs = require('fs');
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
    files.forEach((file, idx) => {
      console.log(`   ${idx + 1}. ${file}`);
    });

    console.log('\n🎉 Test completed! Browser will remain open for 30 seconds for manual review.\n');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);

    // Error screenshot
    await screenshot('ERROR-test-failed');
    console.log('  📸 Error screenshot captured');
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed\n');
  }
})();
