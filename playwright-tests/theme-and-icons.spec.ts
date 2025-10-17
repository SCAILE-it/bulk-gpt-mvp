import { test, expect } from '@playwright/test'

test.describe('Zola Integration - Theme & Icons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  // TEST 1: Theme Toggle
  test('dark mode toggle button exists and works', async ({ page }) => {
    // Find theme toggle button
    const themeToggle = page.locator('button[aria-label="Toggle theme"]')
    
    // Should be visible
    await expect(themeToggle).toBeVisible()
    
    // Initially in light mode (no dark class on html)
    const html = page.locator('html')
    await expect(html).not.toHaveClass('dark')
    
    // Click toggle
    await themeToggle.click()
    await page.waitForTimeout(200)
    
    // Now should have dark class
    await expect(html).toHaveClass('dark')
    
    // Click again
    await themeToggle.click()
    await page.waitForTimeout(200)
    
    // Back to light mode
    await expect(html).not.toHaveClass('dark')
  })

  // TEST 2: Geist Fonts
  test('geist fonts are loaded and applied to body', async ({ page }) => {
    const body = page.locator('body')
    const fontFamily = await body.evaluate(el => {
      return window.getComputedStyle(el).fontFamily
    })
    
    expect(fontFamily).toContain('Geist')
  })

  // TEST 3: Icons Render (Lucide)
  test('lucide icons render without errors', async ({ page }) => {
    // Find elements that should have icons
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    expect(buttonCount).toBeGreaterThan(0)
    
    // Check for SVG icons in buttons (Lucide icons render as SVG)
    const svgs = page.locator('svg')
    const svgCount = await svgs.count()
    
    // Should have some SVG icons
    expect(svgCount).toBeGreaterThan(0)
    
    // No error messages
    const errorMessages = await page.locator('text=Error loading').count()
    expect(errorMessages).toBe(0)
  })

  // TEST 4: Dark Mode Persists (localStorage)
  test('dark mode preference persists on page reload', async ({ page, context }) => {
    // Set dark mode
    const themeToggle = page.locator('button[aria-label="Toggle theme"]')
    await themeToggle.click()
    await page.waitForTimeout(200)
    
    const html = page.locator('html')
    await expect(html).toHaveClass('dark')
    
    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Should still be in dark mode
    await expect(html).toHaveClass('dark')
  })

  // TEST 5: Active/Inactive Panel States
  test('input panel shows active state styling when file is uploaded', async ({ page }) => {
    // Find left panel (input section)
    const sections = page.locator('section')
    const sectionCount = await sections.count()
    
    expect(sectionCount).toBeGreaterThan(0)
    
    // Find file input
    const fileInput = page.locator('input[type="file"]')
    expect(fileInput).toBeVisible()
    
    // Create test CSV
    const testCSV = 'name,company\nAlice,TechCorp\nBob,DataCo'
    
    // Upload file
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCSV),
    })
    
    // Wait for CSV to be processed
    await page.waitForTimeout(500)
    
    // Verify "CSV Loaded" appears (indicates active state)
    const csvLoadedText = page.locator('text=CSV Loaded')
    await expect(csvLoadedText).toBeVisible()
  })

  // TEST 6: No Emojis - Icons Used Instead
  test('no emojis visible in UI, only icons used', async ({ page }) => {
    // Common emoji patterns that should NOT appear
    const emojiPatterns = ['🚀', '📥', '⏳', '▶️', '✓', '✗', '🔄']
    
    const bodyText = await page.locator('body').innerText()
    
    for (const emoji of emojiPatterns) {
      expect(bodyText).not.toContain(emoji)
    }
    
    // Verify icons exist instead
    const svgs = page.locator('svg')
    const svgCount = await svgs.count()
    expect(svgCount).toBeGreaterThan(0)
  })

  // TEST 7: Title has Activity Icon (not rocket emoji)
  test('bulk gpt title uses icon instead of rocket emoji', async ({ page }) => {
    const title = page.locator('h1')
    const titleText = await title.innerText()
    
    // Should not have rocket emoji
    expect(titleText).not.toContain('🚀')
    
    // Should say "Bulk GPT" 
    expect(titleText).toContain('Bulk GPT')
    
    // Should have SVG icon (from Activity/Lucide)
    const icon = title.locator('svg')
    await expect(icon).toBeVisible()
  })

  // TEST 8: Start Processing button uses icons
  test('start processing button uses loading and activity icons', async ({ page }) => {
    // Upload CSV first
    const fileInput = page.locator('input[type="file"]')
    const testCSV = 'name,company\nAlice,TechCorp'
    
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCSV),
    })
    await page.waitForTimeout(300)
    
    // Add prompt
    const promptInput = page.locator('textarea[placeholder*="prompt"]')
    if (await promptInput.count() > 0) {
      await promptInput.fill('Test prompt')
    }
    
    // Find Start Processing button
    const processButton = page.locator('button:has-text("Start Processing")')
    
    if (await processButton.count() > 0) {
      // Should have SVG icon
      const icon = processButton.locator('svg')
      await expect(icon).toBeVisible()
      
      // Should NOT have ▶️ emoji
      const buttonText = await processButton.innerText()
      expect(buttonText).not.toContain('▶️')
      expect(buttonText).not.toContain('⏳')
    }
  })

  // TEST 9: Download button uses icon
  test('download results button uses download icon instead of emoji', async ({ page }) => {
    // Find download button (may not be enabled initially)
    const downloadButtons = page.locator('button:has-text("Download")')
    
    if (await downloadButtons.count() > 0) {
      const button = downloadButtons.first()
      
      // Should have SVG
      const svg = button.locator('svg')
      const svgCount = await svg.count()
      expect(svgCount).toBeGreaterThan(0)
      
      // Should not have emoji
      const text = await button.innerText()
      expect(text).not.toContain('📥')
      expect(text).not.toContain('⬇️')
    }
  })
})
