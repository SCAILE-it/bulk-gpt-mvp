/**
 * E2E Tests for Bulk Processor Fixes
 *
 * This test suite verifies recent fixes to the bulk processor:
 * - Fix 2: Added 2 missing AI tools (web_search, deep_research) - Total 9 tools
 * - Fix 4: Changed progress display from "completed" to "processed"
 */

import { test, expect } from '@playwright/test'

test.use({
  storageState: 'playwright/.auth/user.json'
})

test.describe('Bulk Processor Fixes Verification', () => {

  test('Fix 2: should display 9 AI tools including web_search and deep_research', async ({ page }) => {
    console.log('\n🧪 Testing Fix 2: AI Tools Count')

    // Navigate to bulk processor
    await page.goto('http://localhost:3000/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV to make tool section visible
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('playwright-tests/test-data/test-complete-flow.csv')
    await page.waitForTimeout(2000)

    console.log('  ✓ CSV uploaded')

    // Scroll to Output Settings section to ensure tools are visible
    const outputSettings = page.locator('text=Output Settings').first()
    await outputSettings.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    // Find all tool buttons (they have title attributes)
    const toolButtons = page.locator('button[title]:has-text("refresh"), button[title]:has-text("find"), button[title]:has-text("enrich"), button[title]:has-text("generate"), button[title]:has-text("analyze"), button[title]:has-text("schedule"), button[title]:has-text("get agent"), button[title]:has-text("web"), button[title]:has-text("deep")')

    // Count total tools
    const toolCount = await toolButtons.count()
    console.log(`  ✓ Total tool count: ${toolCount}`)

    // Verify we have 9 tools (was 7 before fix)
    expect(toolCount).toBe(9)

    // Verify specific new tools exist
    const webSearchTool = page.locator('button:has-text("web search")')
    await expect(webSearchTool).toBeVisible()
    console.log('  ✓ "web search" tool visible')

    const deepResearchTool = page.locator('button:has-text("deep research")')
    await expect(deepResearchTool).toBeVisible()
    console.log('  ✓ "deep research" tool visible')

    // Test they're clickable (can be selected)
    await webSearchTool.click()
    await page.waitForTimeout(300)
    console.log('  ✓ "web search" is clickable')

    await deepResearchTool.click()
    await page.waitForTimeout(300)
    console.log('  ✓ "deep research" is clickable')

    // Verify tools are selected (should have visual indicator)
    // The selected state adds a blue dot indicator
    const webSearchSelected = webSearchTool.locator('.bg-blue-400')
    await expect(webSearchSelected).toBeVisible()
    console.log('  ✓ "web search" shows selected state')

    const deepResearchSelected = deepResearchTool.locator('.bg-blue-400')
    await expect(deepResearchSelected).toBeVisible()
    console.log('  ✓ "deep research" shows selected state')

    console.log('✅ Fix 2 test passed: All 9 tools present and functional\n')
  })

  test('Fix 4: should show "processed" instead of "completed" in progress', async ({ page }) => {
    console.log('\n🧪 Testing Fix 4: Progress Display Text')

    // Navigate to bulk processor
    await page.goto('http://localhost:3000/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('playwright-tests/test-data/test-complete-flow.csv')
    await page.waitForTimeout(2000)

    console.log('  ✓ CSV uploaded')

    // Configure prompt
    const promptTextarea = page.locator('textarea').first()
    await promptTextarea.fill('Write a brief bio for {{name}} at {{company}}')
    await page.waitForTimeout(500)

    console.log('  ✓ Prompt configured')

    // Start batch processing
    const runButton = page.locator('button:has-text("Run All")').first()
    await runButton.click()

    console.log('  ✓ Batch started')

    // Wait for progress card to appear (may take a few seconds)
    await page.waitForTimeout(3000)

    // Look for the progress text
    // Expected format: "X / Y processed"
    const progressText = page.locator('text=/\\d+\\s*\\/\\s*\\d+\\s*processed/i')

    // Wait for it to be visible
    await expect(progressText).toBeVisible({ timeout: 10000 })

    const textContent = await progressText.textContent()
    console.log(`  ✓ Progress text found: "${textContent}"`)

    // Verify it matches the expected pattern
    expect(textContent).toMatch(/\d+\s*\/\s*\d+\s*processed/i)
    console.log('  ✓ Text matches pattern "X / Y processed"')

    // Verify "completed" is NOT used in the progress display
    const completedText = page.locator('text=/\\d+\\s*\\/\\s*\\d+\\s*completed/i')
    await expect(completedText).not.toBeVisible()
    console.log('  ✓ "completed" text is NOT present (correct)')

    // Take screenshot for visual confirmation
    await page.screenshot({ path: 'playwright-tests/screenshots/progress-display-fix.png' })
    console.log('  ✓ Screenshot saved: screenshots/progress-display-fix.png')

    console.log('✅ Fix 4 test passed: Progress shows "processed" not "completed"\n')
  })
})
