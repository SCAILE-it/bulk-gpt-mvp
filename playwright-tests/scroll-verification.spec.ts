import { test, expect } from '@playwright/test'

test.describe('Left Sidebar Scroll Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to bulk processor
    await page.goto('http://localhost:3333/bulk')
    await page.waitForLoadState('networkidle')
  })

  const heights = [
    { name: '600px (Small Laptop)', height: 600 },
    { name: '768px (Standard Laptop)', height: 768 },
    { name: '900px (Large Laptop)', height: 900 },
    { name: '1080px (Desktop)', height: 1080 },
  ]

  for (const viewport of heights) {
    test(`Check scroll at ${viewport.name}`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: 1280, height: viewport.height })
      await page.waitForTimeout(500) // Wait for layout

      // Get left sidebar element
      const leftPanel = page.locator('main > div').first() // First div in main is left panel

      // Measure dimensions
      const scrollHeight = await leftPanel.evaluate((el) => el.scrollHeight)
      const clientHeight = await leftPanel.evaluate((el) => el.clientHeight)
      const hasScroll = scrollHeight > clientHeight
      const scrollDifference = scrollHeight - clientHeight

      // Take screenshot
      await page.screenshot({
        path: `test-reports/scroll-check-${viewport.height}px.png`,
        fullPage: false
      })

      // Log results
      console.log(`\n=== ${viewport.name} ===`)
      console.log(`Viewport Height: ${viewport.height}px`)
      console.log(`Content Height: ${scrollHeight}px`)
      console.log(`Visible Height: ${clientHeight}px`)
      console.log(`Needs Scroll: ${hasScroll ? 'YES' : 'NO'}`)
      if (hasScroll) {
        console.log(`Overflow: ${scrollDifference}px`)
      }

      // Assert: No scroll should be needed
      expect(hasScroll, `Left sidebar should NOT scroll at ${viewport.height}px height. Content: ${scrollHeight}px, Visible: ${clientHeight}px, Overflow: ${scrollDifference}px`).toBe(false)
    })
  }

  test('Measure sidebar height breakdown', async ({ page }) => {
    // Set standard viewport
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.waitForTimeout(500)

    // Measure each section
    const measurements = await page.evaluate(() => {
      const leftPanel = document.querySelector('main > div') as HTMLElement
      const sections = {
        'Workflow Steps': leftPanel.querySelector('.space-y-2') as HTMLElement,
        'Upload Area': leftPanel.querySelector('[class*="border-dashed"]') as HTMLElement,
        'Prompt Section': leftPanel.querySelector('#prompt') as HTMLElement,
        'Actions Bar': leftPanel.querySelector('.sticky.bottom-0') as HTMLElement,
      }

      const results: Record<string, number> = {}
      for (const [name, element] of Object.entries(sections)) {
        if (element) {
          results[name] = element.offsetHeight
        }
      }

      results['Total Content'] = leftPanel.scrollHeight
      results['Visible Area'] = leftPanel.clientHeight
      results['Panel Padding'] = parseInt(getComputedStyle(leftPanel).paddingTop) + parseInt(getComputedStyle(leftPanel).paddingBottom)

      return results
    })

    console.log('\n=== Sidebar Height Breakdown ===')
    for (const [section, height] of Object.entries(measurements)) {
      console.log(`${section}: ${height}px`)
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-reports/scroll-check-breakdown.png',
      fullPage: false
    })
  })
})
