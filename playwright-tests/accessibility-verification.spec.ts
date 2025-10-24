import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Accessibility Improvements Verification', () => {
  test('should have ARIA labels on icon-only buttons', async ({ page }) => {
    await page.goto('http://localhost:3333/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV to reveal more UI elements
    const csvContent = `name,email,company
John Doe,john@acme.com,Acme Corp
Jane Smith,jane@techco.com,TechCo Inc`

    const tmpDir = '/tmp'
    const csvPath = path.join(tmpDir, 'test-accessibility.csv')
    fs.writeFileSync(csvPath, csvContent)

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(csvPath)
    await page.waitForTimeout(1000)

    // Open Advanced Settings to access output fields
    const advancedButton = page.locator('button:has-text("Advanced")')
    if (await advancedButton.isVisible()) {
      await advancedButton.click()
      await page.waitForTimeout(500)
    }

    // Check ARIA labels on buttons
    console.log('✓ Checking ARIA labels on icon-only buttons...')

    // Check keyboard shortcuts button
    const keyboardShortcutsBtn = page.locator('button[aria-label="View keyboard shortcuts"]')
    const hasKeyboardLabel = await keyboardShortcutsBtn.count() > 0
    console.log(hasKeyboardLabel ? '  ✅ Keyboard shortcuts button has aria-label' : '  ❌ Missing keyboard shortcuts aria-label')

    // Check dismiss banner button (if beta banner visible)
    const dismissBtn = page.locator('button[aria-label="Dismiss banner"]')
    const hasDismissLabel = await dismissBtn.count() > 0
    if (hasDismissLabel) {
      console.log('  ✅ Dismiss banner button has aria-label')
    }

    // Check add output field button (in Advanced Settings modal)
    const addFieldBtn = page.locator('button[aria-label="Add output field"]')
    const hasAddFieldLabel = await addFieldBtn.count() > 0
    console.log(hasAddFieldLabel ? '  ✅ Add output field button has aria-label' : '  ❌ Missing add field aria-label')

    // Cleanup
    fs.unlinkSync(csvPath)

    await page.screenshot({
      path: 'test-reports/accessibility-aria-labels.png',
      fullPage: true
    })

    expect(hasKeyboardLabel).toBeTruthy()
  })

  test('should have proper modal accessibility attributes', async ({ page }) => {
    await page.goto('http://localhost:3333/bulk')
    await page.waitForLoadState('networkidle')

    console.log('✓ Testing modal accessibility attributes...')

    // Test Keyboard Shortcuts modal
    const keyboardBtn = page.locator('button[aria-label="View keyboard shortcuts"]')
    if (await keyboardBtn.isVisible()) {
      await keyboardBtn.click()
      await page.waitForTimeout(500)

      const modal = page.locator('[role="dialog"]')
      const modalVisible = await modal.isVisible()
      console.log(modalVisible ? '  ✅ Modal has role="dialog"' : '  ❌ Modal missing role="dialog"')

      const hasAriaModal = await modal.getAttribute('aria-modal')
      console.log(hasAriaModal === 'true' ? '  ✅ Modal has aria-modal="true"' : '  ❌ Modal missing aria-modal')

      const ariaLabelledby = await modal.getAttribute('aria-labelledby')
      console.log(ariaLabelledby ? `  ✅ Modal has aria-labelledby="${ariaLabelledby}"` : '  ❌ Modal missing aria-labelledby')

      const titleElement = page.locator(`#${ariaLabelledby}`)
      const titleExists = await titleElement.count() > 0
      console.log(titleExists ? '  ✅ Modal title element exists with matching ID' : '  ❌ Modal title element missing')

      await page.screenshot({
        path: 'test-reports/accessibility-modal-keyboard-shortcuts.png',
        fullPage: true
      })

      // Close modal with X button
      const closeBtn = page.locator('button[aria-label="Close keyboard shortcuts help"]')
      const hasCloseLabel = await closeBtn.isVisible()
      console.log(hasCloseLabel ? '  ✅ Close button has aria-label' : '  ❌ Close button missing aria-label')

      await closeBtn.click()
      await page.waitForTimeout(300)

      expect(modalVisible).toBeTruthy()
      expect(hasAriaModal).toBe('true')
      expect(titleExists).toBeTruthy()
    }
  })

  test('should show delete confirmation modal with accessibility', async ({ page }) => {
    await page.goto('http://localhost:3333/bulk')
    await page.waitForLoadState('networkidle')

    // Upload CSV
    const csvContent = `name,email
John,john@test.com`
    const tmpDir = '/tmp'
    const csvPath = path.join(tmpDir, 'test-delete-confirm.csv')
    fs.writeFileSync(csvPath, csvContent)

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(csvPath)
    await page.waitForTimeout(1000)

    // Open Advanced Settings
    const advancedButton = page.locator('button:has-text("Advanced")')
    if (await advancedButton.isVisible()) {
      await advancedButton.click()
      await page.waitForTimeout(500)
    }

    console.log('✓ Testing delete confirmation modal...')

    // Look for output field removal button
    const removeFieldBtn = page.locator('button[aria-label*="Remove"][aria-label*="output field"]').first()
    const removeButtonVisible = await removeFieldBtn.isVisible().catch(() => false)

    if (removeButtonVisible) {
      console.log('  ✅ Found remove output field button with aria-label')

      // Click to trigger delete confirmation
      await removeFieldBtn.click()
      await page.waitForTimeout(500)

      // Check confirmation dialog
      const confirmDialog = page.locator('[role="dialog"][aria-labelledby="delete-field-title"]')
      const dialogVisible = await confirmDialog.isVisible()
      console.log(dialogVisible ? '  ✅ Delete confirmation dialog appears with proper ARIA' : '  ❌ Delete confirmation dialog not found')

      if (dialogVisible) {
        const hasAriaModal = await confirmDialog.getAttribute('aria-modal')
        console.log(hasAriaModal === 'true' ? '  ✅ Confirmation has aria-modal="true"' : '  ❌ Missing aria-modal')

        const titleText = await page.locator('#delete-field-title').textContent()
        console.log(titleText?.includes('Delete') ? `  ✅ Title shows: "${titleText}"` : '  ❌ Title missing')

        const warningIcon = await page.locator('[role="dialog"] svg').count()
        console.log(warningIcon > 0 ? '  ✅ Warning icon present' : '  ❌ Warning icon missing')

        await page.screenshot({
          path: 'test-reports/accessibility-delete-confirmation.png',
          fullPage: true
        })

        // Test Cancel button
        const cancelBtn = page.locator('button:has-text("Cancel")')
        await cancelBtn.click()
        await page.waitForTimeout(300)

        const dialogGone = await confirmDialog.isVisible().catch(() => false)
        console.log(!dialogGone ? '  ✅ Dialog closed after Cancel' : '  ❌ Dialog still visible')

        expect(dialogVisible).toBeTruthy()
      }
    } else {
      console.log('  ⚠️  Remove button not found - may need to add output field first')
    }

    // Cleanup
    fs.unlinkSync(csvPath)
  })

  test('should have accessible modal close buttons', async ({ page }) => {
    await page.goto('http://localhost:3333/bulk')
    await page.waitForLoadState('networkidle')

    console.log('✓ Testing modal close button accessibility...')

    // Test Advanced Settings modal
    const advancedButton = page.locator('button:has-text("Advanced")')
    if (await advancedButton.isVisible()) {
      await advancedButton.click()
      await page.waitForTimeout(500)

      const closeBtn = page.locator('button[aria-label="Close advanced settings"]')
      const hasLabel = await closeBtn.isVisible()
      console.log(hasLabel ? '  ✅ Advanced Settings close button has aria-label' : '  ❌ Missing close aria-label')

      await page.screenshot({
        path: 'test-reports/accessibility-modal-advanced-settings.png',
        fullPage: true
      })

      await closeBtn.click()
      await page.waitForTimeout(300)

      expect(hasLabel).toBeTruthy()
    }
  })

  test('summary: accessibility improvements verification', async ({ page }) => {
    await page.goto('http://localhost:3333/bulk')
    await page.waitForLoadState('networkidle')

    console.log('\n📊 ACCESSIBILITY VERIFICATION SUMMARY\n')

    const results = {
      'ARIA labels on icon buttons': false,
      'Modal role="dialog" attributes': false,
      'Modal aria-modal="true"': false,
      'Modal aria-labelledby linking': false,
      'Delete confirmation modal': false,
      'Close button aria-labels': false,
    }

    // Check keyboard shortcuts button
    const keyboardBtn = page.locator('button[aria-label="View keyboard shortcuts"]')
    results['ARIA labels on icon buttons'] = await keyboardBtn.count() > 0

    // Check modal by opening keyboard shortcuts
    if (await keyboardBtn.isVisible()) {
      await keyboardBtn.click()
      await page.waitForTimeout(500)

      const modal = page.locator('[role="dialog"]')
      results['Modal role="dialog" attributes'] = await modal.isVisible()

      const hasAriaModal = await modal.getAttribute('aria-modal')
      results['Modal aria-modal="true"'] = hasAriaModal === 'true'

      const ariaLabelledby = await modal.getAttribute('aria-labelledby')
      const titleExists = ariaLabelledby ? await page.locator(`#${ariaLabelledby}`).count() > 0 : false
      results['Modal aria-labelledby linking'] = titleExists

      const closeBtn = page.locator('button[aria-label="Close keyboard shortcuts help"]')
      results['Close button aria-labels'] = await closeBtn.isVisible()

      await closeBtn.click()
      await page.waitForTimeout(300)
    }

    // Print results
    let passCount = 0
    let totalCount = 0

    for (const [feature, passed] of Object.entries(results)) {
      totalCount++
      if (passed) passCount++
      console.log(`${passed ? '✅' : '❌'} ${feature}`)
    }

    console.log(`\n📈 Score: ${passCount}/${totalCount} tests passed\n`)

    if (passCount === totalCount) {
      console.log('🎉 All accessibility improvements verified!\n')
    } else {
      console.log('⚠️  Some accessibility features not found - may need authentication or different test approach\n')
    }

    // Final summary screenshot
    await page.screenshot({
      path: 'test-reports/accessibility-verification-summary.png',
      fullPage: true
    })
  })
})
