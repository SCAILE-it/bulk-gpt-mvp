import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Visual Audit - Wizard UX', () => {
  test('capture all wizard steps with new design', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5180/auth');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(1000);

    // Navigate to wizard
    await page.goto('http://localhost:5180/wizard');
    await page.waitForLoadState('networkidle');

    // Step 1: Upload - Initial state
    await page.screenshot({
      path: '/tmp/audit-step1-upload-initial.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Step 1 Upload Initial');

    // Create test CSV
    const csvContent = `name,email,company,title
John Doe,john@example.com,Acme Inc,CEO
Jane Smith,jane@example.com,Tech Corp,CTO
Bob Johnson,bob@example.com,StartupCo,Founder`;

    // Upload CSV file
    const fileInput = page.locator('input[type="file"]');
    const buffer = Buffer.from(csvContent);
    await fileInput.setInputFiles({
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    });

    // Wait for preview to load
    await page.waitForTimeout(1000);

    // Step 1: Upload - Preview state
    await page.screenshot({
      path: '/tmp/audit-step1-upload-preview.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Step 1 Upload Preview');

    // Click Continue
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);

    // Step 2: Configure - Initial
    await page.screenshot({
      path: '/tmp/audit-step2-configure-initial.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Step 2 Configure Initial');

    // Fill prompt
    await page.fill('textarea#prompt', 'Write a professional bio for {{name}} who works as {{title}} at {{company}}');
    await page.waitForTimeout(500);

    // Step 2: Configure - With prompt
    await page.screenshot({
      path: '/tmp/audit-step2-configure-filled.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Step 2 Configure Filled');

    // Click Test Mode card to ensure it's selected
    await page.click('text=Test Mode');
    await page.waitForTimeout(300);

    // Step 2: Configure - Test mode selected
    await page.screenshot({
      path: '/tmp/audit-step2-configure-testmode.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Step 2 Configure Test Mode');

    // Expand Advanced Options
    const advancedButton = page.locator('button:has-text("Advanced Options")');
    await advancedButton.click();
    await page.waitForTimeout(500);

    // Step 2: Configure - Advanced expanded
    await page.screenshot({
      path: '/tmp/audit-step2-configure-advanced.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Step 2 Configure Advanced');

    // Collapse Advanced Options
    await advancedButton.click();
    await page.waitForTimeout(300);

    // Note: Not clicking "Start Processing" to avoid actual API calls
    // Just capture the UI state

    console.log('\n✅ All screenshots captured successfully!');
    console.log('Screenshots saved to /tmp/audit-*.png');
  });

  test('capture spacing and typography details', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5180/auth');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(1000);

    await page.goto('http://localhost:5180/wizard');
    await page.waitForLoadState('networkidle');

    // Zoom in on upload area to see spacing
    const uploadCard = page.locator('text=Upload CSV File').locator('..');
    await uploadCard.screenshot({
      path: '/tmp/audit-detail-upload-card.png'
    });
    console.log('✓ Screenshot: Upload card detail');

    // Upload and check preview typography
    const csvContent = `name,email\nTest User,test@example.com`;
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    await page.waitForTimeout(1000);

    // Capture file info header (spacing detail)
    const fileInfo = page.locator('text=test.csv').locator('..');
    await fileInfo.screenshot({
      path: '/tmp/audit-detail-file-info.png'
    });
    console.log('✓ Screenshot: File info typography');

    console.log('\n✅ Detail screenshots captured!');
  });

  test('verify smooth transitions on interactions', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5180/auth');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(1000);

    await page.goto('http://localhost:5180/wizard');
    await page.waitForLoadState('networkidle');

    // Test drag hover state
    const dropzone = page.locator('text=Upload CSV File').locator('..');

    // Capture normal state
    await dropzone.screenshot({
      path: '/tmp/audit-transition-dropzone-normal.png'
    });

    // Hover state
    await dropzone.hover();
    await page.waitForTimeout(300); // Wait for transition
    await dropzone.screenshot({
      path: '/tmp/audit-transition-dropzone-hover.png'
    });

    console.log('✓ Screenshot: Dropzone hover transition');

    // Upload and test button transitions
    const csvContent = `name\nTest`;
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    await page.waitForTimeout(1000);

    // Click Continue and go to Step 2
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(500);

    // Test mode card - normal
    const testModeCard = page.locator('text=Test Mode').locator('..');
    await testModeCard.screenshot({
      path: '/tmp/audit-transition-card-normal.png'
    });

    // Test mode card - hover
    await testModeCard.hover();
    await page.waitForTimeout(300);
    await testModeCard.screenshot({
      path: '/tmp/audit-transition-card-hover.png'
    });

    console.log('✓ Screenshot: Card hover transition');
    console.log('\n✅ Transition screenshots captured!');
  });
});
