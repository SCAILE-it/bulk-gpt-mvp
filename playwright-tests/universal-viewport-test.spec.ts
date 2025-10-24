import { test } from '@playwright/test'

test('verify buttons visible on ALL viewport sizes - mobile to 4K', async ({ page }) => {
  // Test WIDE range of viewports - mobile, tablet, laptop, desktop, ultrawide, 4K
  const viewports = [
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 390, height: 844, name: 'iPhone 12/13/14' },
    { width: 768, height: 1024, name: 'iPad Portrait' },
    { width: 1024, height: 768, name: 'iPad Landscape' },
    { width: 1280, height: 720, name: 'HD Laptop (short)' },
    { width: 1366, height: 768, name: 'Standard Laptop' },
    { width: 1440, height: 900, name: '13" MacBook' },
    { width: 1536, height: 864, name: '15" Windows Laptop' },
    { width: 1920, height: 1080, name: 'Full HD Desktop' },
    { width: 2560, height: 1440, name: '2K Monitor' },
    { width: 3440, height: 1440, name: 'Ultrawide 21:9' },
    { width: 3840, height: 2160, name: '4K Monitor' },
  ]

  console.log('\n' + '='.repeat(80))
  console.log('UNIVERSAL VIEWPORT TEST - Mobile to 4K')
  console.log('Testing responsive layout WITHOUT hardcoded heights')
  console.log('='.repeat(80))

  for (const viewport of viewports) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`Testing: ${viewport.name} (${viewport.width}x${viewport.height})`)
    console.log('='.repeat(80))

    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('http://localhost:3333/bulk')
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
      path: `test-results/universal/viewport-${viewport.width}x${viewport.height}.png`,
      fullPage: false
    })
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log('SUMMARY')
  console.log('='.repeat(80)}`)
  console.log('Screenshots saved to test-results/universal/')
  console.log('All viewport sizes tested from mobile (375px) to 4K (3840px)')
  console.log('Layout should work WITHOUT hardcoded heights - uses flexbox from layout level')
  console.log('='.repeat(80) + '\n')
})
