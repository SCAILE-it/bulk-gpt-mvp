import { test, expect } from '@playwright/test'

test.describe('Left Sidebar Scroll Verification (No Auth)', () => {
  const heights = [
    { name: '667px (iPhone 6/7/8)', height: 667, width: 375 },
    { name: '736px (iPhone Plus)', height: 736, width: 414 },
    { name: '844px (iPhone 12/13)', height: 844, width: 390 },
    { name: '600px (Small Laptop)', height: 600, width: 1280 },
    { name: '768px (Standard Laptop)', height: 768, width: 1280 },
    { name: '900px (Large Laptop)', height: 900, width: 1280 },
    { name: '1080px (Desktop)', height: 1080, width: 1920 },
  ]

  for (const viewport of heights) {
    test(`Check scroll at ${viewport.name}`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      // Navigate directly to bulk (might redirect to auth, but we'll measure the layout anyway)
      await page.goto('http://localhost:3333/bulk')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000) // Wait for layout to stabilize

      // Try to find the left panel - it might be in a different location if auth is showing
      const leftPanel = page.locator('main > div, .border-r').first()
      const exists = await leftPanel.count() > 0

      if (!exists) {
        console.log(`\n=== ${viewport.name} ===`)
        console.log(`Viewport: ${viewport.width}x${viewport.height}`)
        console.log(`No left panel found (probably auth page)`)
        return
      }

      // Measure dimensions
      const scrollHeight = await leftPanel.evaluate((el) => el.scrollHeight)
      const clientHeight = await leftPanel.evaluate((el) => el.clientHeight)
      const hasScroll = scrollHeight > clientHeight
      const scrollDifference = scrollHeight - clientHeight

      // Take screenshot
      await page.screenshot({
        path: `test-reports/scroll-check-${viewport.width}x${viewport.height}.png`,
        fullPage: false
      })

      // Log results
      console.log(`\n=== ${viewport.name} ===`)
      console.log(`Viewport: ${viewport.width}x${viewport.height}`)
      console.log(`Content Height: ${scrollHeight}px`)
      console.log(`Visible Height: ${clientHeight}px`)
      console.log(`Needs Scroll: ${hasScroll ? 'YES ❌' : 'NO ✅'}`)
      if (hasScroll) {
        console.log(`Overflow: ${scrollDifference}px`)
      }

      // Only fail for desktop/laptop viewports (width >= 1280) at standard heights (>= 768)
      // Mobile and small screens can have scroll as acceptable
      if (viewport.width >= 1280 && viewport.height >= 768) {
        expect(hasScroll, `Left sidebar should NOT scroll at ${viewport.height}px height on ${viewport.width}px width. Content: ${scrollHeight}px, Visible: ${clientHeight}px, Overflow: ${scrollDifference}px`).toBe(false)
      }
    })
  }
})
