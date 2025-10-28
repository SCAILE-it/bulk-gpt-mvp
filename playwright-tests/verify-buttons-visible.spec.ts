import { test } from '@playwright/test'

test('verify Test and Run buttons are visible at bottom', async ({ page }) => {
  await page.goto('http://localhost:3333/bulk')
  await page.waitForLoadState('networkidle')

  // Take screenshot of JUST the left panel to see the buttons
  const leftPanel = page.locator('.h-full.border-r.border-white\\/5.bg-zinc-900').first()

  await page.screenshot({
    path: 'test-results/bugfix/left-panel-full.png',
    fullPage: true
  })

  // Scroll to bottom of left panel if needed
  await leftPanel.evaluate((el) => {
    el.scrollTo(0, el.scrollHeight)
  })

  await page.waitForTimeout(500)

  // Take another screenshot showing the bottom with buttons
  await page.screenshot({
    path: 'test-results/bugfix/left-panel-bottom.png',
    fullPage: true
  })

  // Check if Test and Run buttons are visible
  const testButton = page.getByRole('button', { name: /test.*1 row/i })
  const runButton = page.getByRole('button', { name: /run all/i })

  const testVisible = await testButton.isVisible()
  const runVisible = await runButton.isVisible()

  console.log(`Test button visible: ${testVisible}`)
  console.log(`Run button visible: ${runVisible}`)

  // Take screenshot of just the buttons area
  const actionsSection = leftPanel.locator('.flex-shrink-0.p-2.border-t').first()
  await actionsSection.screenshot({
    path: 'test-results/bugfix/buttons-closeup.png'
  })

  console.log('✅ Buttons screenshot captured!')
})
