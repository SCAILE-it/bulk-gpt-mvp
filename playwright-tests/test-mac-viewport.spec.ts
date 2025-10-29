import { test } from '@playwright/test'

test('test typical Mac viewport sizes', async ({ page }) => {
  // Common Mac viewport sizes
  const macViewports = [
    { width: 1440, height: 900, name: '13-inch MacBook Air/Pro' },
    { width: 1680, height: 1050, name: '15-inch MacBook Pro' },
    { width: 1920, height: 1080, name: '16-inch MacBook Pro' },
    { width: 2560, height: 1440, name: '27-inch iMac / External Display' }
  ]

  for (const viewport of macViewports) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`Testing: ${viewport.name} (${viewport.width}x${viewport.height})`)
    console.log('='.repeat(80))

    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('http://localhost:3334/bulk')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Check if buttons are visible without scrolling
    const leftPanel = page.locator('.h-full.border-r.border-white\\/5.bg-zinc-900').first()
    const actionsSection = leftPanel.locator('.flex-shrink-0.p-2.border-t').first()

    const actionsBoundingBox = await actionsSection.boundingBox()
    const viewportHeight = viewport.height

    if (actionsBoundingBox) {
      const buttonsTop = actionsBoundingBox.y
      const buttonsBottom = actionsBoundingBox.y + actionsBoundingBox.height
      const buttonsVisibleWithoutScroll = buttonsBottom <= viewportHeight

      console.log(`Buttons position:`)
      console.log(`  Top: ${buttonsTop}px`)
      console.log(`  Bottom: ${buttonsBottom}px`)
      console.log(`  Viewport height: ${viewportHeight}px`)
      console.log(`  Visible without scroll: ${buttonsVisibleWithoutScroll ? '✅ YES' : '❌ NO - NEED TO SCROLL'}`)

      if (!buttonsVisibleWithoutScroll) {
        console.log(`  ⚠️  Buttons are ${buttonsBottom - viewportHeight}px below the fold!`)
      }
    }

    // Take screenshot
    await page.screenshot({
      path: `test-results/bugfix/mac-viewport-${viewport.width}x${viewport.height}.png`,
      fullPage: false
    })

    // Scroll left panel to bottom and take another screenshot
    await leftPanel.evaluate((el) => {
      el.scrollTo(0, el.scrollHeight)
    })
    await page.waitForTimeout(500)

    await page.screenshot({
      path: `test-results/bugfix/mac-viewport-${viewport.width}x${viewport.height}-scrolled.png`,
      fullPage: false
    })
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log('Screenshots saved to test-results/bugfix/')
  console.log('Check if buttons are visible without scrolling on each viewport size.')
})
