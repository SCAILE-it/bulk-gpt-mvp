const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 DEEP ONBOARDING INVESTIGATION\n');
    
    // Login first
    await page.goto('https://bulk-gpt-app.vercel.app', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'test@bulkgpt.local');
    await page.fill('input[type="password"]', 'Test123456!');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(2000);
    
    // Navigate to bulk
    await page.goto('https://bulk-gpt-app.vercel.app/bulk', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Clear localStorage
    console.log('1. Clearing localStorage...');
    await page.evaluate(() => {
      localStorage.removeItem('bulk-gpt-onboarding-seen');
      return localStorage.getItem('bulk-gpt-onboarding-seen');
    });
    
    // Check conditions for onboarding
    console.log('2. Checking onboarding conditions...');
    const conditions = await page.evaluate(() => {
      const hasCSV = document.querySelector('input[type="file"]')?.files?.length > 0;
      const hasPrompt = document.querySelector('textarea')?.value?.trim().length > 0;
      const onboardingSeen = localStorage.getItem('bulk-gpt-onboarding-seen');
      
      return { hasCSV, hasPrompt, onboardingSeen };
    });
    
    console.log(`   Has CSV: ${conditions.hasCSV}`);
    console.log(`   Has Prompt: ${conditions.hasPrompt}`);
    console.log(`   Onboarding seen: ${conditions.onboardingSeen}`);
    
    // Reload
    console.log('3. Reloading page...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Check for onboarding
    const onboarding = await page.locator('text=/Welcome|Upload your CSV|Describe|Get your enriched/').first();
    const isVisible = await onboarding.isVisible().catch(() => false);
    console.log(`4. Onboarding visible after reload: ${isVisible}`);
    
    // Check React component state
    const reactState = await page.evaluate(() => {
      // Try to find onboarding component
      const modals = document.querySelectorAll('[class*="fixed"], [class*="modal"], [class*="overlay"]');
      return Array.from(modals).map(m => ({
        visible: window.getComputedStyle(m).display !== 'none',
        zIndex: window.getComputedStyle(m).zIndex,
        classes: m.className
      }));
    });
    
    console.log(`5. Modal/Overlay elements: ${reactState.length}`);
    reactState.forEach((state, i) => {
      console.log(`   ${i + 1}. Visible: ${state.visible}, zIndex: ${state.zIndex}`);
    });
    
    // Check if onboarding component exists but is hidden
    const onboardingComponent = await page.locator('[class*="onboarding"], [class*="Onboarding"]').first();
    const componentExists = await onboardingComponent.isVisible().catch(() => false);
    console.log(`6. Onboarding component exists: ${componentExists}`);
    
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
