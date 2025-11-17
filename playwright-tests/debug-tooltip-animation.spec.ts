/**
 * Automated test to debug tooltip animation issues
 * Run this to check if tooltips are flying in from top-left
 */

import { test, expect } from '@playwright/test'

test.describe('Tooltip Animation Debug', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto('/test-tooltip')
    await page.waitForLoadState('networkidle')
  })

  test('should detect tooltip animation issues', async ({ page }) => {
    // Enable console logging
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      if (msg.text().includes('Tooltip Debug') || msg.text().includes('transform') || msg.text().includes('animation')) {
        consoleLogs.push(msg.text())
      }
    })

    // Find all tooltip triggers
    const tooltipTriggers = await page.locator('button:has-text("Hover me"), button:has-text("Top"), button:has-text("Bottom"), button:has-text("Left"), button:has-text("Right"), button:has-text("Button")').all()
    
    console.log(`Found ${tooltipTriggers.length} tooltip triggers`)

    for (let i = 0; i < Math.min(tooltipTriggers.length, 5); i++) {
      const trigger = tooltipTriggers[i]
      
      // Take screenshot before hover
      await page.screenshot({ path: `test-results/tooltip-before-${i}.png`, fullPage: true })
      
      // Hover over trigger
      await trigger.hover()
      
      // Wait a bit for tooltip to appear
      await page.waitForTimeout(100)
      
      // Check if tooltip exists
      const tooltip = page.locator('[data-radix-tooltip-content]').first()
      const tooltipExists = await tooltip.count() > 0
      
      if (tooltipExists) {
        // Get computed styles
        const transform = await tooltip.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          return {
            transform: computed.transform,
            animation: computed.animation,
            transition: computed.transition,
            inlineTransform: el.style.transform,
            inlineAnimation: el.style.animation,
          }
        })
        
        console.log(`Tooltip ${i} styles:`, transform)
        
        // Check for problematic transforms/animations
        const hasTransform = transform.transform !== 'none' && transform.transform !== 'matrix(1, 0, 0, 1, 0, 0)'
        const hasAnimation = transform.animation !== 'none'
        const hasInlineTransform = transform.inlineTransform && transform.inlineTransform !== 'none'
        const hasInlineAnimation = transform.inlineAnimation && transform.inlineAnimation !== 'none'
        
        if (hasTransform || hasAnimation || hasInlineTransform || hasInlineAnimation) {
          console.error(`❌ Tooltip ${i} HAS ANIMATION ISSUES:`)
          console.error('  Transform:', transform.transform)
          console.error('  Animation:', transform.animation)
          console.error('  Inline Transform:', transform.inlineTransform)
          console.error('  Inline Animation:', transform.inlineAnimation)
        } else {
          console.log(`✅ Tooltip ${i} is clean`)
        }
        
        // Take screenshot with tooltip visible
        await page.screenshot({ path: `test-results/tooltip-visible-${i}.png`, fullPage: true })
        
        // Wait a bit to see if animation happens
        await page.waitForTimeout(200)
        
        // Check again after delay
        const transformAfter = await tooltip.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          return {
            transform: computed.transform,
            animation: computed.animation,
          }
        })
        
        if (transformAfter.transform !== transform.transform || transformAfter.animation !== transform.animation) {
          console.error(`❌ Tooltip ${i} styles changed after delay!`)
          console.error('  Before:', transform)
          console.error('  After:', transformAfter)
        }
      }
      
      // Move mouse away
      await page.mouse.move(0, 0)
      await page.waitForTimeout(100)
    }

    // Print all console logs
    console.log('\n=== Console Logs ===')
    consoleLogs.forEach(log => console.log(log))
  })

  test('should verify tooltip appears instantly without animation', async ({ page }) => {
    // Record video or take screenshots at high frequency
    const trigger = page.locator('button:has-text("Hover me")').first()
    
    // Start hovering
    await trigger.hover()
    
    // Rapid screenshots to catch animation
    const screenshots: Buffer[] = []
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(20) // 20ms intervals = 50fps
      const screenshot = await page.screenshot()
      screenshots.push(screenshot)
    }
    
    // Check if tooltip position changed significantly between screenshots
    // (This would indicate animation)
    const tooltip = page.locator('[data-radix-tooltip-content]').first()
    if (await tooltip.count() > 0) {
      const positions = []
      for (let i = 0; i < screenshots.length; i++) {
        const box = await tooltip.boundingBox()
        if (box) {
          positions.push({ x: box.x, y: box.y, frame: i })
        }
        await page.waitForTimeout(20)
      }
      
      // Check if position changed significantly (more than 1px)
      const positionChanges = positions.filter((pos, i) => {
        if (i === 0) return false
        const prev = positions[i - 1]
        const dx = Math.abs(pos.x - prev.x)
        const dy = Math.abs(pos.y - prev.y)
        return dx > 1 || dy > 1
      })
      
      if (positionChanges.length > 0) {
        console.error('❌ Tooltip position changed during appearance (animation detected)')
        console.error('Position changes:', positionChanges)
      } else {
        console.log('✅ Tooltip appeared instantly without position changes')
      }
    }
  })
})



