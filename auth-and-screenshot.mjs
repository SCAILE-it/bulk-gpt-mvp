import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1400, height: 900 });
  
  try {
    // Try to get Supabase credentials from env or find them
    console.log('1. Checking for Supabase setup...');
    
    // Go to home page first to potentially get any cookies/session
    console.log('2. Going to home page...');
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(3000);
    
    // Check if we got redirected
    const url = page.url();
    console.log('URL after home:', url);
    
    // Try to access /agents/bulk
    console.log('3. Trying /agents/bulk...');
    await page.goto('http://localhost:3000/agents/bulk', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    
    const bulkUrl = page.url();
    console.log('URL at /agents/bulk:', bulkUrl);
    console.log('Successfully on agents/bulk:', bulkUrl.includes('/agents/bulk'));
    
    // Take screenshot
    console.log('4. Taking screenshot...');
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false });
    console.log('✅ Screenshot saved');
    
  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: '/tmp/run-page.png', fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
