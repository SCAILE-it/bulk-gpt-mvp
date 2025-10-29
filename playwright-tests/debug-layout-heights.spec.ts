import { test } from '@playwright/test'

test('debug layout heights to find extra 69px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://localhost:3334/bulk')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  console.log('\n' + '='.repeat(80))
  console.log('DEBUGGING LAYOUT HEIGHTS - 1440x900 viewport')
  console.log('='.repeat(80))

  // Measure viewport
  const viewportHeight = 900
  console.log(`\nViewport Height: ${viewportHeight}px`)

  // Measure root div (should be h-screen = 100vh = 900px)
  const rootDiv = page.locator('div.h-screen.bg-zinc-950').first()
  const rootBox = await rootDiv.boundingBox()
  if (rootBox) {
    console.log(`\nRoot div (h-screen):`)
    console.log(`  Y: ${rootBox.y}px`)
    console.log(`  Height: ${rootBox.height}px`)
    console.log(`  Bottom: ${rootBox.y + rootBox.height}px`)
    console.log(`  Expected: ${viewportHeight}px (100vh)`)
    console.log(`  Difference: ${rootBox.height - viewportHeight}px`)
  }

  // Measure header
  const header = page.locator('header.flex-shrink-0').first()
  const headerBox = await header.boundingBox()
  if (headerBox) {
    console.log(`\nHeader (flex-shrink-0):`)
    console.log(`  Y: ${headerBox.y}px`)
    console.log(`  Height: ${headerBox.height}px`)
    console.log(`  Bottom: ${headerBox.y + headerBox.height}px`)
  }

  // Measure main element
  const main = page.locator('main.flex-1').first()
  const mainBox = await main.boundingBox()
  if (mainBox) {
    console.log(`\nMain (flex-1 h-full):`)
    console.log(`  Y: ${mainBox.y}px`)
    console.log(`  Height: ${mainBox.height}px`)
    console.log(`  Bottom: ${mainBox.y + mainBox.height}px`)
    console.log(`  Expected: ${viewportHeight - (headerBox?.height || 0)}px (viewport - header)`)
    if (headerBox) {
      console.log(`  Difference: ${mainBox.height - (viewportHeight - headerBox.height)}px`)
    }
  }

  // Measure left panel
  const leftPanel = page.locator('.h-full.border-r.border-white\\/5.bg-zinc-900').first()
  const leftPanelBox = await leftPanel.boundingBox()
  if (leftPanelBox) {
    console.log(`\nLeft Panel (h-full flex flex-col):`)
    console.log(`  Y: ${leftPanelBox.y}px`)
    console.log(`  Height: ${leftPanelBox.height}px`)
    console.log(`  Bottom: ${leftPanelBox.y + leftPanelBox.height}px`)
  }

  // Measure content area
  const contentArea = leftPanel.locator('.flex-1.overflow-y-auto').first()
  const contentBox = await contentArea.boundingBox()
  if (contentBox) {
    console.log(`\nContent Area (flex-1 overflow-y-auto):`)
    console.log(`  Y: ${contentBox.y}px`)
    console.log(`  Height: ${contentBox.height}px`)
    console.log(`  Bottom: ${contentBox.y + contentBox.height}px`)
  }

  // Measure actions section (buttons)
  const actionsSection = leftPanel.locator('.flex-shrink-0.p-2.border-t').first()
  const actionsBox = await actionsSection.boundingBox()
  if (actionsBox) {
    console.log(`\nActions Section (flex-shrink-0):`)
    console.log(`  Y: ${actionsBox.y}px`)
    console.log(`  Height: ${actionsBox.height}px`)
    console.log(`  Bottom: ${actionsBox.y + actionsBox.height}px`)
    console.log(`  Buttons below viewport: ${(actionsBox.y + actionsBox.height) - viewportHeight}px`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('ANALYSIS')
  console.log('='.repeat(80))

  if (rootBox && actionsBox) {
    console.log(`\nRoot div height: ${rootBox.height}px`)
    console.log(`Viewport height: ${viewportHeight}px`)
    console.log(`Root overflow: ${rootBox.height - viewportHeight}px`)

    console.log(`\nButtons bottom: ${actionsBox.y + actionsBox.height}px`)
    console.log(`Viewport bottom: ${viewportHeight}px`)
    console.log(`Buttons below viewport: ${(actionsBox.y + actionsBox.height) - viewportHeight}px`)
  }

  console.log('\n' + '='.repeat(80) + '\n')
})
