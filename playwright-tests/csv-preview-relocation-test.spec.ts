import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('CSV Preview Relocation Verification', () => {
  test('CSV preview appears in left sidebar, not right panel', async ({ page }) => {
    // Navigate to bulk processor
    await page.goto('http://localhost:3333/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV file
    const csvPath = path.join(__dirname, '../public/sample.csv')
    await page.setInputFiles('input[type="file"]', csvPath)

    // Wait for upload to complete
    await page.waitForTimeout(2000)

    // Verify preview appears in LEFT sidebar with new title
    const leftSidebar = page.locator('div.border-r.border-white\\/5').first()
    const previewInLeftSidebar = leftSidebar.locator('h3:has-text("Data Preview")')
    await expect(previewInLeftSidebar).toBeVisible({ timeout: 5000 })

    // Verify preview table exists in left sidebar
    const previewTable = leftSidebar.locator('table').first()
    await expect(previewTable).toBeVisible()

    // Verify table has max-height constraint (compact design)
    const tableContainer = leftSidebar.locator('div.max-h-\\[200px\\]')
    await expect(tableContainer).toBeVisible()

    // Verify right panel shows "No results yet" message (not CSV preview)
    const rightPanel = page.locator('main').locator('> div').nth(1)
    const noResultsMessage = rightPanel.locator('h3:has-text("No results yet")')
    await expect(noResultsMessage).toBeVisible()

    // Verify old "CSV Preview" heading does NOT exist in right panel
    const oldCsvPreview = rightPanel.locator('h3:has-text("CSV Preview")')
    await expect(oldCsvPreview).not.toBeVisible()

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-reports/csv-preview-relocated.png',
      fullPage: true
    })

    console.log('✓ CSV preview successfully relocated to left sidebar')
    console.log('✓ Right panel correctly shows empty state')
    console.log('✓ Preview uses compact design with max-height')
  })
})
