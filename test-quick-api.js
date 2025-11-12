/**
 * QUICK API TEST - Fast validation of API endpoints
 * Tests a single scenario quickly to verify API is working
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'https://bulk-gpt-app.vercel.app';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@bulkgpt.local';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test123456!';

async function quickTest() {
  console.log('🚀 Quick API Test\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Authenticate
    console.log('1. Authenticating...');
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    await submitButton.click();
    
    // Wait a bit for auth
    await page.waitForTimeout(3000);
    
    // Get cookies
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    if (!cookieString) {
      console.log('  ⚠ No cookies - trying sign-up...');
      const signUpLink = page.locator('button:has-text("Sign up"), button:has-text("Don\'t have")').first();
      if (await signUpLink.count() > 0) {
        await signUpLink.click();
        await page.waitForTimeout(1000);
        const confirmPassword = page.locator('input[type="password"]').nth(1);
        if (await confirmPassword.count() > 0) {
          await emailInput.fill(TEST_EMAIL);
          await passwordInput.fill(TEST_PASSWORD);
          await confirmPassword.fill(TEST_PASSWORD);
          await submitButton.click();
          await page.waitForTimeout(3000);
        }
      }
    }
    
    const finalCookies = await page.context().cookies();
    const finalCookieString = finalCookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    if (!finalCookieString) {
      throw new Error('Authentication failed - no cookies obtained');
    }
    
    console.log('  ✓ Authentication successful\n');
    
    // Parse CSV
    console.log('2. Loading test data...');
    const csvPath = path.join(__dirname, 'public/examples/sample-input.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
    console.log(`  ✓ Loaded ${rows.length} rows\n`);
    
    // Test API
    console.log('3. Testing API endpoint...');
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': finalCookieString,
      },
      body: JSON.stringify({
        csvFilename: 'quick-test.csv',
        rows: rows.slice(0, 2), // Just 2 rows for quick test
        prompt: 'Generate a brief summary for each person.',
        outputColumns: [{ name: 'summary', type: 'text' }],
        tools: [],
      }),
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`  ✓ Batch created: ${data.batchId}`);
    console.log(`  ⏱️  Duration: ${duration}ms\n`);
    
    // Check status
    console.log('4. Checking batch status...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(`${BASE_URL}/api/batch/${data.batchId}/status`, {
      headers: {
        'Cookie': finalCookieString,
      },
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`  Status: ${statusData.status}`);
      console.log(`  Progress: ${statusData.progressPercent || 0}%`);
      console.log(`  Processed: ${statusData.processedRows || 0}/${statusData.totalRows || 0} rows\n`);
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Quick test completed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

quickTest().catch(console.error);


