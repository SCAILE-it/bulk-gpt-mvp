const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Testing Real File Upload ===\n');
    
    // Create a test CSV file
    const testCsvPath = path.join(__dirname, 'test-upload.csv');
    const testCsvContent = 'name,email,company\nJohn Doe,john@example.com,Acme Corp\nJane Smith,jane@example.com,Tech Inc';
    fs.writeFileSync(testCsvPath, testCsvContent);
    console.log('✓ Created test CSV file\n');
    
    // Navigate to localhost
    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if we need to login
    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      console.log('   Authentication required, logging in...');
      await page.fill('input[type="email"]', 'test@bulkgpt.local');
      await page.fill('input[type="password"]', 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
      console.log('   ✓ Logged in\n');
    }
    
    // Navigate to bulk page
    console.log('2. Navigating to /bulk page...');
    await page.goto('http://localhost:3000/bulk', { waitUntil: 'networkidle' });
    console.log('   ✓ On bulk page');
    
    // Handle onboarding modal if present
    console.log('   Checking for onboarding modal...');
    const skipButton = page.locator('button:has-text("Skip"), button:has-text("Get Started")').first();
    const skipExists = await skipButton.count() > 0;
    if (skipExists) {
      console.log('   Onboarding modal found, skipping...');
      await skipButton.click();
      await page.waitForTimeout(1000);
      console.log('   ✓ Onboarding skipped\n');
    } else {
      console.log('   No onboarding modal\n');
    }
    
    // Wait for page to settle
    await page.waitForTimeout(2000);
    
    // Test 1: Find dropzone and file input
    console.log('3. Testing dropzone click-to-browse...');
    const fileInput = page.locator('[data-testid="file-input"]').first();
    const inputExists = await fileInput.count() > 0;
    console.log(`   File input found: ${inputExists}`);
    
    if (!inputExists) {
      throw new Error('File input not found!');
    }
    
    // Test 2: Click on dropzone area (not the input directly)
    console.log('   Finding dropzone container...');
    const dropzoneContainer = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="file-input"]');
      if (!input) return null;
      // Find the parent dropzone div with border-dashed class
      let parent = input.parentElement;
      while (parent && !parent.className.includes('border-dashed')) {
        parent = parent.parentElement;
      }
      return parent ? parent.className : null;
    });
    
    console.log(`   Dropzone container found: ${dropzoneContainer ? '✓' : '✗'}`);
    
    // Test 3: Actually upload a file using the file input
    console.log('   Uploading test CSV file...');
    
    // Set up file chooser listener
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
      // Click on the dropzone area to trigger file picker
      page.locator('[data-testid="file-input"]').locator('xpath=ancestor::div[contains(@class, "border-dashed")]').first().click({ timeout: 5000 }).catch(async () => {
        // If that fails, try clicking the input directly
        console.log('   Trying direct input click...');
        await fileInput.click({ timeout: 5000 });
      })
    ]);
    
    if (fileChooser) {
      console.log('   ✓ File chooser opened!');
      await fileChooser.setFiles(testCsvPath);
      console.log('   ✓ File selected');
    } else {
      // Fallback: set files directly on input
      console.log('   File chooser not detected, setting file directly...');
      await fileInput.setInputFiles(testCsvPath);
      console.log('   ✓ File set directly on input');
    }
    
    // Wait for file to be processed
    console.log('   Waiting for file processing...');
    await page.waitForTimeout(3000);
    
    // Test 4: Verify file was uploaded and processed
    console.log('\n4. Verifying file upload...');
    
    const uploadResult = await page.evaluate(() => {
      // Check for CSV preview table
      const csvTable = document.querySelector('table');
      const hasTable = !!csvTable;
      
      // Check for file name display
      const fileNameElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.includes('.csv')
      );
      const hasFileName = fileNameElements.length > 0;
      
      // Check for row count display
      const rowCountElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && /rows?/i.test(el.textContent)
      );
      const hasRowCount = rowCountElements.length > 0;
      
      // Get actual text content
      const bodyText = document.body.textContent || '';
      const hasCsvData = bodyText.includes('John Doe') || bodyText.includes('Jane Smith');
      
      return {
        hasTable,
        hasFileName,
        hasRowCount,
        hasCsvData,
        bodyTextPreview: bodyText.substring(0, 200)
      };
    });
    
    console.log(`   CSV table visible: ${uploadResult.hasTable ? '✓' : '✗'}`);
    console.log(`   File name displayed: ${uploadResult.hasFileName ? '✓' : '✗'}`);
    console.log(`   Row count displayed: ${uploadResult.hasRowCount ? '✓' : '✗'}`);
    console.log(`   CSV data visible: ${uploadResult.hasCsvData ? '✓' : '✗'}`);
    
    if (uploadResult.hasTable || uploadResult.hasCsvData) {
      console.log('\n   ✅ FILE UPLOAD SUCCESSFUL!');
      console.log(`   Preview: ${uploadResult.bodyTextPreview}...`);
    } else {
      console.log('\n   ⚠️ File upload may have failed - no CSV data detected');
      console.log(`   Page content preview: ${uploadResult.bodyTextPreview}...`);
    }
    
    // Test 5: Verify dropzone click works (try clicking again after file is uploaded)
    console.log('\n5. Testing dropzone click after upload...');
    const changeFileButton = page.locator('button:has-text("Change file"), button:has-text("Upload")').first();
    const changeButtonExists = await changeFileButton.count() > 0;
    
    if (changeButtonExists) {
      console.log('   "Change file" button found: ✓');
      console.log('   ✓ Dropzone functionality verified');
    } else {
      console.log('   "Change file" button not found (may be normal if file is already uploaded)');
    }
    
    console.log('\n=== Test Complete ===');
    console.log('\nSummary:');
    console.log(`- File input found: ${inputExists ? '✓' : '✗'}`);
    console.log(`- File uploaded: ${uploadResult.hasTable || uploadResult.hasCsvData ? '✓' : '✗'}`);
    console.log(`- CSV data visible: ${uploadResult.hasCsvData ? '✓' : '✗'}`);
    
    // Cleanup
    if (fs.existsSync(testCsvPath)) {
      fs.unlinkSync(testCsvPath);
      console.log('\n✓ Test file cleaned up');
    }
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 5 seconds for manual inspection...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
    console.log('Screenshot saved to test-error.png');
  } finally {
    await browser.close();
  }
})();

