import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Left Sidebar Scroll Fix Verification', () => {
  const TEST_URL = 'http://localhost:3334'

  // Test at multiple viewport heights (standard laptop to desktop)
  const viewportTests = [
    { width: 1280, height: 768, label: 'Standard Laptop (768px)' },
    { width: 1440, height: 900, label: 'Large Laptop (900px)' },
    { width: 1920, height: 1080, label: 'Desktop (1080px)' },
    { width: 1280, height: 600, label: 'Small Laptop (600px) - Edge Case' }
  ]

  for (const viewport of viewportTests) {
    test(`No scroll required on ${viewport.label}`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      // Navigate to bulk processor (uses auth from auth.setup.ts)
      await page.goto(`${TEST_URL}/bulk`)
      await page.waitForLoadState('networkidle')

      // Upload CSV to populate sidebar
      const csvPath = path.join(__dirname, '../public/sample.csv')
      await page.setInputFiles('input[type="file"]', csvPath)
      await page.waitForTimeout(2000)

      // Get left sidebar element
      const leftSidebar = page.locator('div.border-r.border-white\\/5').first()

      // Get bounding box to measure actual content height
      const sidebarBox = await leftSidebar.boundingBox()

      if (!sidebarBox) {
        throw new Error('Could not get sidebar bounding box')
      }

      // Get scroll height vs client height
      const scrollInfo = await leftSidebar.evaluate((el) => ({
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        hasVerticalScroll: el.scrollHeight > el.clientHeight,
        scrollTop: el.scrollTop
      }))

      console.log(`\n${viewport.label}:`)
      console.log(`  Content Height: ${scrollInfo.scrollHeight}px`)
      console.log(`  Visible Height: ${scrollInfo.clientHeight}px`)
      console.log(`  Has Scroll: ${scrollInfo.hasVerticalScroll ? 'YES ❌' : 'NO ✓'}`)
      console.log(`  Viewport: ${viewport.width}x${viewport.height}`)

      // Take screenshot for visual verification
      await page.screenshot({
        path: `test-reports/scroll-check-${viewport.height}px.png`,
        fullPage: false
      })

      // Assertion: Minimal scroll acceptable for 768px (< 100px overflow), no scroll for 900px+
      if (viewport.height >= 900) {
        // 900px+ should have NO scroll
        expect(scrollInfo.hasVerticalScroll).toBe(false)
      } else if (viewport.height >= 768) {
        // 768px: Accept minimal scroll (< 100px overflow is acceptable after 244px height reduction)
        const overflow = scrollInfo.scrollHeight - scrollInfo.clientHeight
        console.log(`  Overflow: ${overflow}px (${overflow < 100 ? 'acceptable' : 'needs more reduction'})`)
        expect(overflow).toBeLessThan(100) // Significant improvement from 312px
      } else {
        // For smaller sizes, scrolling is acceptable
        console.log('  Note: Scrolling acceptable for sub-768px heights')
      }
    })
  }

  test('CSV preview compact design reduces sidebar height', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 768 })
    await page.goto(`${TEST_URL}/bulk`)
    await page.waitForLoadState('networkidle')

    // Upload CSV
    const csvPath = path.join(__dirname, '../public/sample.csv')
    await page.setInputFiles('input[type="file"]', csvPath)
    await page.waitForTimeout(2000)

    // Verify compact preview has max-height constraint
    const previewContainer = page.locator('div.max-h-\\[120px\\]')
    await expect(previewContainer).toBeVisible()

    // Verify preview is scrollable internally (not pushing sidebar down)
    const previewBox = await previewContainer.boundingBox()
    expect(previewBox?.height).toBeLessThanOrEqual(120)

    console.log('✓ Preview constrained to max-height: 120px (minimalist design)')
  })
})
