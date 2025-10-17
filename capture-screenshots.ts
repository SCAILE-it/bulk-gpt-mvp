import { chromium, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOTS_DIR = './screenshots'

async function ensureDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
}

async function captureFlow(page: Page, flowName: string, stepName: string) {
  const filename = `${flowName}-${stepName}.png`
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  await page.screenshot({ path: filepath, fullPage: true })
  console.log(`✅ Captured: ${filename}`)
  return filepath
}

async function main() {
  await ensureDir()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    console.log('📸 Capturing Bulk GPT User Flows...\n')

    // ==================== FLOW 1: Initial Load ====================
    console.log('📹 FLOW 1: Initial Page Load')
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await captureFlow(page, 'flow-01-initial', '01-page-loaded')
    console.log('✅ Initial page load captured\n')

    // ==================== FLOW 2: UI Overview ====================
    console.log('📹 FLOW 2: Full UI Layout')
    await page.waitForTimeout(500)
    await captureFlow(page, 'flow-02-layout', '01-two-panel-layout')
    console.log('✅ Layout overview captured\n')

    // ==================== FLOW 3: CSV Upload Flow ====================
    console.log('📹 FLOW 3: CSV Upload Flow')
    
    // Scroll to upload area
    const uploadArea = page.locator('[class*="Drag and drop"]').first()
    await uploadArea.scrollIntoViewIfNeeded()
    await captureFlow(page, 'flow-03-upload', '01-upload-area-ready')

    // Create and upload CSV
    const csvContent = 'name,company,role\nAlice Johnson,TechCorp,Engineer\nBob Smith,DataCo,Analyst\nCarol White,AILabs,Manager'
    const fileInput = page.locator('input[type="file"]')
    
    await fileInput.setInputFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await page.waitForTimeout(1500)
    await captureFlow(page, 'flow-03-upload', '02-after-upload')
    console.log('✅ CSV upload flow captured\n')

    // ==================== FLOW 4: Prompt Entry ====================
    console.log('📹 FLOW 4: Prompt Entry')
    
    const promptTextarea = page.locator('textarea#prompt')
    const testPrompt = 'Write a professional bio for {{name}} who works as a {{role}} at {{company}}. Keep it to 2-3 sentences.'
    
    await promptTextarea.fill(testPrompt)
    await page.waitForTimeout(300)
    await captureFlow(page, 'flow-04-prompt', '01-prompt-entered')
    console.log('✅ Prompt entry captured\n')

    // ==================== FLOW 5: Context Entry (Optional) ====================
    console.log('📹 FLOW 5: Adding Context')
    
    const contextTextarea = page.locator('textarea#context')
    const testContext = 'Focus on professional achievements and experience. Tone should be formal and business-appropriate.'
    
    await contextTextarea.fill(testContext)
    await page.waitForTimeout(300)
    await captureFlow(page, 'flow-05-context', '01-context-added')
    console.log('✅ Context entry captured\n')

    // ==================== FLOW 6: Ready to Process ====================
    console.log('📹 FLOW 6: Form Complete - Ready to Process')
    
    const startButton = page.getByRole('button', { name: 'Start Processing' })
    await startButton.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await captureFlow(page, 'flow-06-ready', '01-all-filled-button-enabled')
    console.log('✅ Ready state captured\n')

    // ==================== FLOW 7: Button Interaction ====================
    console.log('📹 FLOW 7: Processing Initiated')
    
    // Highlight the button before clicking
    await startButton.hover()
    await page.waitForTimeout(200)
    await captureFlow(page, 'flow-07-processing', '01-button-hover-state')
    
    // Show the button click
    await captureFlow(page, 'flow-07-processing', '02-before-click')
    console.log('✅ Button interaction captured\n')

    // ==================== FLOW 8: Results Section ====================
    console.log('📹 FLOW 8: Results Display Area')
    
    // Scroll to results section
    const resultsSection = page.locator('main > section').last()
    await resultsSection.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await captureFlow(page, 'flow-08-results', '01-empty-results-state')
    console.log('✅ Results section captured\n')

    // ==================== FLOW 9: Export Options ====================
    console.log('📹 FLOW 9: Export & Download Options')
    
    // Scroll back to top to show full page with export ready
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'flow-09-export', '01-export-ready-interface')
    console.log('✅ Export options captured\n')

    // ==================== FLOW 10: Responsive Design ====================
    console.log('📹 FLOW 10: Mobile Responsiveness')
    
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'flow-10-responsive', '01-mobile-view')
    console.log('✅ Mobile view captured\n')

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'flow-10-responsive', '02-tablet-view')
    console.log('✅ Tablet view captured\n')

    // Desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'flow-10-responsive', '03-desktop-view')
    console.log('✅ Desktop view captured\n')

    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL SCREENSHOTS CAPTURED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log(`📁 Location: ${SCREENSHOTS_DIR}/`)
    console.log('\n📋 Screenshots captured:')
    
    const files = fs.readdirSync(SCREENSHOTS_DIR).sort()
    files.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file}`)
    })

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error)
  } finally {
    await browser.close()
  }
}

main()


