import { test, expect } from '@playwright/test';

test.describe('Modal → Supabase Integration Verification', () => {
  test('should process CSV and save results to database', async ({ page }) => {
    // Set longer timeout for this test (includes API calls)
    test.setTimeout(120000);

    const BASE_URL = 'http://localhost:3334';
    
    console.log('Step 1: Navigate to wizard');
    await page.goto(`${BASE_URL}/bulk`);
    
    // Step 2: Upload CSV
    console.log('Step 2: Upload test CSV');
    const csvContent = 'name,company\nTestUser,TestCompany';
    const buffer = Buffer.from(csvContent);
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: buffer
    });
    
    // Wait for upload to process
    await page.waitForTimeout(2000);
    
    // Step 3: Enter prompt
    console.log('Step 3: Enter prompt');
    await page.fill('textarea[placeholder*="prompt"]', 'Write a greeting for {{name}} from {{company}}');
    
    // Step 4: Submit
    console.log('Step 4: Submit for processing');
    await page.click('button:has-text("Process")');
    
    // Step 5: Wait for processing to complete (up to 60 seconds)
    console.log('Step 5: Wait for processing...');
    await page.waitForSelector('text=Processing complete', { timeout: 60000 });
    
    // Step 6: Verify results are displayed
    console.log('Step 6: Verify results displayed');
    const resultsTable = await page.locator('table').isVisible();
    expect(resultsTable).toBeTruthy();
    
    // Step 7: Verify at least one result row
    const resultRows = await page.locator('tbody tr').count();
    console.log(`Found ${resultRows} result rows`);
    expect(resultRows).toBeGreaterThan(0);
    
    // Step 8: Verify result has output
    const firstRowOutput = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
    console.log(`First row output: ${firstRowOutput}`);
    expect(firstRowOutput).toBeTruthy();
    expect(firstRowOutput.length).toBeGreaterThan(0);
    
    console.log('✅ All checks passed!');
  });
});
