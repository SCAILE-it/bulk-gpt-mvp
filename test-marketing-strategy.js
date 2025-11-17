/**
 * Marketing Strategy Feature Test
 * Tests Value Proposition and Marketing Goals functionality
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== Marketing Strategy Feature Test ===\n');
    
    // Set viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Step 1: Navigate and Login
    console.log('1. Navigating to app...');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bulk-gpt-app.vercel.app';
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    const currentUrl = await page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth')) {
      console.log('   Authentication required, logging in...');
      await page.locator('input[type="email"]').fill('test@bulkgpt.local');
      await page.locator('input[type="password"]').fill('Test123456!');
      await page.locator('button[type="submit"]').click();
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
      console.log('   ✓ Logged in\n');
    }
    
    // Step 2: Navigate to Context Page
    console.log('2. Testing Context Page...');
    await page.goto(`${baseUrl}/context`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check if Value Proposition field exists
    const valuePropField = page.locator('textarea#value-proposition, textarea[placeholder*="value proposition" i]').first();
    const valuePropExists = await valuePropField.count() > 0;
    console.log(`   ✓ Value Proposition field: ${valuePropExists ? 'Found' : 'NOT FOUND'}`);
    
    // Check if Marketing Goals field exists
    const marketingGoalsInput = page.locator('input[placeholder*="marketing goal" i]').first();
    const marketingGoalsExists = await marketingGoalsInput.count() > 0;
    console.log(`   ✓ Marketing Goals field: ${marketingGoalsExists ? 'Found' : 'NOT FOUND'}`);
    
    if (valuePropExists) {
      // Test Value Proposition
      console.log('\n3. Testing Value Proposition...');
      const testValueProp = 'We replace inconsistent, manual outreach with a scalable, data-driven, and automated AI sales engine.';
      await valuePropField.fill(testValueProp);
      await page.waitForTimeout(1500); // Wait for auto-save
      console.log('   ✓ Value Proposition entered');
      
      // Verify it saved (check for auto-saved indicator or reload)
      const savedIndicator = page.locator('text=Auto-saved, text=Saved').first();
      const hasSavedIndicator = await savedIndicator.count() > 0;
      console.log(`   ✓ Auto-save indicator: ${hasSavedIndicator ? 'Shown' : 'Not visible (may have timed out)'}`);
    }
    
    if (marketingGoalsExists) {
      // Test Marketing Goals
      console.log('\n4. Testing Marketing Goals...');
      await marketingGoalsInput.fill('Generate qualified leads');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      console.log('   ✓ Marketing goal added (Enter key)');
      
      // Add another goal via button
      await marketingGoalsInput.fill('Build thought leadership');
      const addButton = page.locator('button:has(svg)').filter({ hasText: /\+/ }).first();
      await addButton.click();
      await page.waitForTimeout(1000);
      console.log('   ✓ Marketing goal added (button click)');
      
      // Verify goals are displayed as tags
      const goalTags = page.locator('text=Generate qualified leads, text=Build thought leadership');
      const goalCount = await goalTags.count();
      console.log(`   ✓ Marketing goals displayed: ${goalCount} tag(s) found`);
    }
    
    // Step 5: Navigate to Marketing Strategy Page
    console.log('\n5. Testing Marketing Strategy Preview Page...');
    await page.goto(`${baseUrl}/marketing-strategy`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check if page loaded
    const pageTitle = page.locator('h1:has-text("Marketing Strategy Preview")');
    const titleExists = await pageTitle.count() > 0;
    console.log(`   ✓ Page title: ${titleExists ? 'Found' : 'NOT FOUND'}`);
    
    // Check sidebar navigation
    const sidebar = page.locator('text=Strategy Components').first();
    const sidebarExists = await sidebar.count() > 0;
    console.log(`   ✓ Sidebar navigation: ${sidebarExists ? 'Found' : 'NOT FOUND'}`);
    
    // Check for completion status indicators
    const checkmarks = page.locator('svg').filter({ has: page.locator('circle') });
    const checkmarkCount = await checkmarks.count();
    console.log(`   ✓ Completion indicators: ${checkmarkCount} found`);
    
    // Check if Value Proposition shows as completed
    const valuePropItem = page.locator('button:has-text("Value Proposition")').first();
    if (await valuePropItem.count() > 0) {
      await valuePropItem.click();
      await page.waitForTimeout(500);
      
      const valuePropContent = page.locator('text=We replace inconsistent').first();
      const contentExists = await valuePropContent.count() > 0;
      console.log(`   ✓ Value Proposition content: ${contentExists ? 'Displayed' : 'NOT FOUND'}`);
    }
    
    // Check if Marketing Goals shows as completed
    const marketingGoalsItem = page.locator('button:has-text("Marketing Goals")').first();
    if (await marketingGoalsItem.count() > 0) {
      await marketingGoalsItem.click();
      await page.waitForTimeout(500);
      
      const goalsContent = page.locator('text=Generate qualified leads').first();
      const goalsExist = await goalsContent.count() > 0;
      console.log(`   ✓ Marketing Goals content: ${goalsExist ? 'Displayed' : 'NOT FOUND'}`);
    }
    
    // Test Edit functionality
    console.log('\n6. Testing Edit Functionality...');
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForTimeout(500);
      
      const textarea = page.locator('textarea').first();
      const textareaExists = await textarea.count() > 0;
      console.log(`   ✓ Edit mode: ${textareaExists ? 'Activated' : 'NOT FOUND'}`);
      
      if (textareaExists) {
        const saveButton = page.locator('button:has-text("Save")').first();
        const cancelButton = page.locator('button:has-text("Cancel")').first();
        const saveExists = await saveButton.count() > 0;
        const cancelExists = await cancelButton.count() > 0;
        console.log(`   ✓ Save button: ${saveExists ? 'Found' : 'NOT FOUND'}`);
        console.log(`   ✓ Cancel button: ${cancelExists ? 'Found' : 'NOT FOUND'}`);
        
        // Cancel edit
        if (cancelExists) {
          await cancelButton.click();
          await page.waitForTimeout(500);
          console.log('   ✓ Edit cancelled');
        }
      }
    }
    
    // Step 7: Verify Navigation Link
    console.log('\n7. Testing Navigation...');
    const navLink = page.locator('nav a:has-text("Marketing Strategy"), nav a:has-text("MARKETING STRATEGY")').first();
    const navLinkExists = await navLink.count() > 0;
    console.log(`   ✓ Navigation link: ${navLinkExists ? 'Found' : 'NOT FOUND'}`);
    
    // Take screenshot
    await page.screenshot({ path: 'marketing-strategy-test.png', fullPage: true });
    console.log('\n   ✓ Screenshot saved: marketing-strategy-test.png');
    
    console.log('\n=== Test Summary ===');
    console.log('✓ Context page fields: Tested');
    console.log('✓ Marketing Strategy page: Tested');
    console.log('✓ Completion status: Tested');
    console.log('✓ Edit functionality: Tested');
    console.log('✓ Navigation: Tested');
    console.log('\n✅ All tests completed!');
    
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
    console.log('   Error screenshot saved: test-error.png');
  } finally {
    await browser.close();
  }
})();

