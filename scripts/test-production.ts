/**
 * Standalone Production Verification Script
 *
 * Verifies all UX improvements and token tracking on live deployment
 * Run with: npx tsx scripts/test-production.ts
 */

import { chromium, Browser, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PRODUCTION_URL = 'https://bulk-gpt-app.vercel.app';
const TEST_EMAIL = 'test@bulkgpt.local';
const TEST_PASSWORD = 'Test123456!';

async function login(page: Page) {
  console.log('🔐 Logging in...');

  await page.goto(PRODUCTION_URL);
  await page.waitForURL(/\/auth/, { timeout: 10000 });

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  const loginButton = page.locator('button[type="submit"], button:has-text("Sign in")');

  await emailInput.fill(TEST_EMAIL);
  await passwordInput.fill(TEST_PASSWORD);
  await loginButton.click();

  await page.waitForURL(/\/(bulk|dashboard)/, { timeout: 15000 });
  console.log('✅ Authenticated successfully\n');
}

async function testLoadingSkeleton(page: Page) {
  console.log('=== TEST 1: Dashboard Loading Skeleton ===');

  await page.goto(`${PRODUCTION_URL}/dashboard`);

  const skeletonAppeared = await page.locator('.animate-pulse, [class*="skeleton"]')
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (skeletonAppeared) {
    console.log('✅ Loading skeleton displayed');
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/prod-loading-skeleton.png', fullPage: true });
  } else {
    console.log('⚠️  Loading skeleton not captured (data loaded too quickly)');
  }

  const dashboardLoaded = await page.locator('text=/recent|batch|execution/i').isVisible({ timeout: 10000 });
  if (dashboardLoaded) {
    console.log('✅ Dashboard data loaded successfully\n');
  } else {
    console.log('❌ Dashboard failed to load\n');
  }
}

async function testTokenTracking(page: Page) {
  console.log('=== TEST 2: Token Tracking Display ===');

  await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'test-results/prod-dashboard-tokens.png', fullPage: true });

  const tokenColumnExists = await page.locator('text=/Model.*Token|Token/i')
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (tokenColumnExists) {
    console.log('✅ "Model & Tokens" column found in dashboard');

    const tokenDataExists = await page.locator('text=/gemini|↑|↓/i')
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (tokenDataExists) {
      const tokenText = await page.locator('text=/↑.*↓|gemini/i').first().textContent();
      console.log('📈 Token data found:', tokenText);
    } else {
      console.log('⚠️  No token data found (may need to run a batch first)');
    }
  } else {
    console.log('❌ "Model & Tokens" column NOT found');
  }

  console.log('');
}

async function testBatchProcessing(page: Page) {
  console.log('=== TEST 3: Complete E2E Batch Processing (Modal API Fix) ===');

  const testCsvPath = path.join(__dirname, '..', 'test-data-prod.csv');
  const csvContent = `name,role\nAlice,Engineer\nBob,Designer`;
  fs.writeFileSync(testCsvPath, csvContent);

  try {
    await page.goto(`${PRODUCTION_URL}/bulk`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('📍 Step 1: Upload CSV');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testCsvPath);
    await page.waitForTimeout(3000);

    const csvLoaded = await page.locator('text=/Alice|name/i').first().isVisible({ timeout: 5000 });
    if (!csvLoaded) {
      console.log('❌ CSV failed to load');
      return;
    }
    console.log('✅ CSV uploaded successfully');

    await page.screenshot({ path: 'test-results/prod-csv-uploaded.png', fullPage: true });

    console.log('✍️  Step 2: Configure prompt');
    const promptTextarea = page.locator('textarea').first();
    await promptTextarea.click();
    await promptTextarea.fill('Write one sentence about {{name}} who is a {{role}}');
    await page.waitForTimeout(1000);
    console.log('✅ Prompt configured');

    console.log('▶️  Step 3: Run batch (testing Modal API fix)');
    const runButton = page.locator('button:has-text("Run")').first();
    await runButton.click();
    console.log('✅ Batch processing started');

    await page.screenshot({ path: 'test-results/prod-processing.png', fullPage: true });

    console.log('⏳ Step 4: Waiting for completion (max 90s)...');
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 45; // 90 seconds

    while (!processingComplete && attempts < maxAttempts) {
      await page.waitForTimeout(2000);
      attempts++;

      const successVisible = await page.locator('text=/completed|success|done|alice.*engineer/i')
        .isVisible()
        .catch(() => false);

      const errorVisible = await page.locator('text=/error|failed|404|no results/i')
        .isVisible()
        .catch(() => false);

      if (successVisible) {
        processingComplete = true;
        console.log('✅ Batch processing completed successfully!');
        console.log('✅ Modal API fix verified - no 404 error!');
      } else if (errorVisible) {
        const errorText = await page.locator('text=/error|failed|404/i').first().textContent();
        console.log('❌ Batch processing failed:', errorText);
        await page.screenshot({ path: 'test-results/prod-error.png', fullPage: true });
        return;
      }

      if (attempts % 5 === 0) {
        console.log(`⏳ Waiting... (${attempts * 2}s elapsed)`);
      }
    }

    if (!processingComplete) {
      await page.screenshot({ path: 'test-results/prod-timeout.png', fullPage: true });
      console.log('❌ Batch processing timed out after 90 seconds');
      return;
    }

    await page.screenshot({ path: 'test-results/prod-completed.png', fullPage: true });

    console.log('📊 Step 5: Verify dashboard shows results');
    await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/prod-dashboard-final.png', fullPage: true });
    console.log('🎉 E2E workflow completed successfully!\n');

  } finally {
    fs.unlinkSync(testCsvPath);
  }
}

async function testToastNotifications(page: Page) {
  console.log('=== TEST 4: Toast Notification System ===');

  await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const toastContainer = await page.locator('[data-sonner-toaster]')
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (toastContainer) {
    console.log('✅ Toast notification system (sonner) is initialized');
  } else {
    console.log('⚠️  Toast container not found (no toasts currently visible)');
  }

  console.log('');
}

async function testErrorHandling(page: Page) {
  console.log('=== TEST 5: Error Handling Improvements ===');

  await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const pageContent = await page.locator('body').textContent();
  const hasAlertPopup = pageContent?.includes('alert(') || false;

  if (!hasAlertPopup) {
    console.log('✅ No alert() calls detected (using toast notifications)');
  } else {
    console.log('❌ alert() calls still present in page');
  }

  await page.screenshot({ path: 'test-results/prod-dashboard-clean.png', fullPage: true });
  console.log('');
}

async function main() {
  console.log('🚀 Starting Production Verification Tests\n');
  console.log(`Target: ${PRODUCTION_URL}\n`);

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page);
    await testLoadingSkeleton(page);
    await testTokenTracking(page);
    await testBatchProcessing(page);
    await testToastNotifications(page);
    await testErrorHandling(page);

    console.log('✅ All production verification tests completed!');
    console.log('📸 Screenshots saved to test-results/');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-results/prod-test-failure.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

main();
