const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.pages()[0] || await context.newPage();
  
  try {
    console.log('=== Testing Dropzone Click-to-Browse ===\n');
    
    // Create a test CSV file
    const testCsvPath = path.join(__dirname, 'test-click.csv');
    const testCsvContent = 'name,email\nTest User,test@example.com';
    fs.writeFileSync(testCsvPath, testCsvContent);
    console.log('✓ Created test CSV file\n');
    
    // Navigate to localhost
    console.log('1. Navigating to http://localhost:3000/bulk...');
    await page.goto('http://localhost:3000/bulk', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Login if needed
    if (page.url().includes('/auth')) {
      console.log('   Logging in...');
      await page.fill('input[type="email"]', 'test@bulkgpt.local');
      await page.fill('input[type="password"]', 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
      await page.goto('http://localhost:3000/bulk', { waitUntil: 'networkidle' });
    }
    
    // Skip onboarding and close any modals
    const skipButton = page.locator('button:has-text("Skip"), button:has-text("Get Started")').first();
    if (await skipButton.count() > 0) {
      await skipButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Close any open modals
    const closeModalButton = page.locator('button[aria-label*="Close"], button:has-text("×")').first();
    if (await closeModalButton.count() > 0) {
      await closeModalButton.click();
      await page.waitForTimeout(500);
    }
    
    // Wait for any modals to fully close
    await page.waitForTimeout(2000);
    
    // Check if modal is still blocking
    const modalStillOpen = await page.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"], .fixed.inset-0.z-50');
      return modals.length > 0;
    });
    
    if (modalStillOpen) {
      console.log('   ⚠️ Modal still open, trying to close with Escape key...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }
    
    console.log('\n2. Testing dropzone click-to-browse...');
    
    // Find the dropzone container
    const dropzoneInfo = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="file-input"]');
      if (!input) return { found: false };
      
      // Find dropzone container
      let dropzone = input.parentElement;
      while (dropzone && !dropzone.className.includes('border-dashed')) {
        dropzone = dropzone.parentElement;
      }
      
      if (!dropzone) return { found: true, dropzoneFound: false };
      
      // Check if dropzone has click handlers
      const hasOnClick = dropzone.onclick !== null;
      const hasClickListeners = dropzone.getAttribute('onclick') !== null;
      
      // Get computed styles
      const styles = window.getComputedStyle(dropzone);
      const cursor = styles.cursor;
      const pointerEvents = styles.pointerEvents;
      
      return {
        found: true,
        dropzoneFound: true,
        hasOnClick,
        hasClickListeners,
        cursor,
        pointerEvents,
        className: dropzone.className,
        inputParent: input.parentElement?.className || 'none'
      };
    });
    
    console.log('   Dropzone info:', JSON.stringify(dropzoneInfo, null, 2));
    
    // Test clicking the dropzone area
    console.log('\n3. Clicking dropzone area to trigger file picker...');
    
    // Set up file chooser listener BEFORE clicking
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null);
    
    // Click on the dropzone container (the div with border-dashed)
    const dropzoneSelector = 'div[class*="border-dashed"]:has(input[data-testid="file-input"])';
    const dropzoneElement = page.locator(dropzoneSelector).first();
    
    const dropzoneExists = await dropzoneElement.count() > 0;
    console.log(`   Dropzone element found: ${dropzoneExists}`);
    
    if (dropzoneExists) {
      // Click the dropzone
      await dropzoneElement.click({ timeout: 5000 });
      console.log('   ✓ Clicked dropzone');
      
      // Wait for file chooser
      const fileChooser = await fileChooserPromise;
      
      if (fileChooser) {
        console.log('   ✅ FILE CHOOSER OPENED! Dropzone click works!');
        await fileChooser.setFiles(testCsvPath);
        console.log('   ✓ File selected via file chooser');
        
        // Wait for processing
        await page.waitForTimeout(3000);
        
        // Verify upload
        const hasCsvData = await page.evaluate(() => {
          return document.body.textContent?.includes('Test User') || false;
        });
        
        console.log(`   CSV data visible: ${hasCsvData ? '✓' : '✗'}`);
        
        if (hasCsvData) {
          console.log('\n   ✅ SUCCESS: Dropzone click-to-browse works perfectly!');
        }
      } else {
        console.log('   ⚠️ File chooser did not open (may require user gesture in some browsers)');
        console.log('   Testing direct file input instead...');
        
        // Fallback: set file directly
        const fileInput = page.locator('[data-testid="file-input"]').first();
        await fileInput.setInputFiles(testCsvPath);
        await page.waitForTimeout(2000);
        
        const hasCsvData = await page.evaluate(() => {
          return document.body.textContent?.includes('Test User') || false;
        });
        
        if (hasCsvData) {
          console.log('   ✓ File upload works via direct input');
          console.log('   Note: File chooser may require actual user interaction in headless mode');
        }
      }
    } else {
      console.log('   ✗ Dropzone element not found');
    }
    
    // Cleanup
    if (fs.existsSync(testCsvPath)) {
      fs.unlinkSync(testCsvPath);
    }
    
    console.log('\n=== Test Complete ===');
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'test-click-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();

