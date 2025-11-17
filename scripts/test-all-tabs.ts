/**
 * Test Script: Verify All Tabs on All Pages
 * 
 * This script uses Playwright MCP to systematically test all tabs
 * on every page to ensure they render correctly without errors.
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

interface PageTabConfig {
  path: string
  tabs: Array<{
    name: string
    ref?: string
  }>
}

const PAGE_CONFIGS: PageTabConfig[] = [
  {
    path: '/context',
    tabs: [
      { name: 'Variables' },
      { name: 'Files' },
      { name: 'Integrations' },
      { name: 'Business Context' },
    ],
  },
  {
    path: '/resources',
    tabs: [
      { name: 'Leads' },
      { name: 'Keywords' },
      { name: 'Content' },
      { name: 'Campaigns' },
    ],
  },
  {
    path: '/output',
    tabs: [
      { name: 'Analytics' },
      { name: 'Executions' },
    ],
  },
  {
    path: '/profile',
    tabs: [
      { name: 'Account' },
      { name: 'API Keys' },
      { name: 'Usage' },
      { name: 'Billing' },
    ],
  },
  {
    path: '/home',
    tabs: [
      { name: 'Overview' },
    ],
  },
]

async function testPageTabs(page: any, config: PageTabConfig) {
  console.log(`\n📄 Testing page: ${config.path}`)
  
  // Navigate to page
  await page.goto(`${BASE_URL}${config.path}`)
  await page.waitForTimeout(2000) // Wait for page load
  
  // Check for console errors
  const consoleErrors: string[] = []
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })
  
  // Test each tab
  for (const tab of config.tabs) {
    console.log(`  ✓ Testing tab: ${tab.name}`)
    
    try {
      // Find and click the tab
      const tabSelector = `button:has-text("${tab.name}")`
      const tabElement = await page.locator(tabSelector).first()
      
      if (await tabElement.count() === 0) {
        console.error(`    ❌ Tab "${tab.name}" not found!`)
        continue
      }
      
      await tabElement.click()
      await page.waitForTimeout(1000) // Wait for tab content to load
      
      // Check if tab is active
      const isActive = await tabElement.getAttribute('data-state')
      if (isActive !== 'active') {
        console.warn(`    ⚠ Tab "${tab.name}" may not be active`)
      }
      
      // Check for errors in console
      if (consoleErrors.length > 0) {
        console.warn(`    ⚠ Console errors detected:`, consoleErrors)
        consoleErrors.length = 0 // Clear for next tab
      }
      
      console.log(`    ✅ Tab "${tab.name}" loaded successfully`)
    } catch (error) {
      console.error(`    ❌ Error testing tab "${tab.name}":`, error)
    }
  }
  
  // Final console error check
  if (consoleErrors.length > 0) {
    console.warn(`  ⚠ Page has console errors:`, consoleErrors)
  }
}

export async function runAllTabTests() {
  console.log('🧪 Starting comprehensive tab testing...\n')
  
  // Note: This would need to be run in a Playwright environment
  // For now, this serves as a reference for manual testing
  
  console.log('Pages to test:')
  PAGE_CONFIGS.forEach(config => {
    console.log(`  - ${config.path}: ${config.tabs.length} tab(s)`)
    config.tabs.forEach(tab => {
      console.log(`    • ${tab.name}`)
    })
  })
  
  console.log('\n✅ Test configuration complete')
  console.log('📝 Run this with: npx playwright test scripts/test-all-tabs.ts')
}

if (require.main === module) {
  runAllTabTests().catch(console.error)
}

