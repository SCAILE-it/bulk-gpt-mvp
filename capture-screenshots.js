const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3000'
const SCREENSHOTS_DIR = './screenshots'

async function ensureDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
}

async function captureFlow(page, flowName, stepName) {
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

    // Flow 1: Initial Load
    console.log('📹 FLOW 1: Initial Page Load')
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await captureFlow(page, 'flow-01-initial', '01-page-loaded')

    // Flow 2: Layout
    console.log('📹 FLOW 2: Full UI Layout')
    await page.waitForTimeout(500)
    await captureFlow(page, 'flow-02-layout', '01-two-panel-layout')

    // Flow 3: CSV Upload
    console.log('📹 FLOW 3: CSV Upload Flow')
    const csvContent = 'name,company,role\nAlice Johnson,TechCorp,Engineer\nBob Smith,DataCo,Analyst\nCarol White,AILabs,Manager'
    const fileInput = await page.$('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })
    await page.waitForTimeout(1500)
    await captureFlow(page, 'flow-03-upload', '02-after-upload')

    // Flow 4: Prompt Entry
    console.log('📹 FLOW 4: Prompt Entry')
    await page.$eval('textarea#prompt', el => {
      el.value = 'Write a professional bio for {{name}} who works as a {{role}} at {{company}}. Keep it to 2-3 sentences.'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(300)
    await captureFlow(page, 'flow-04-prompt', '01-prompt-entered')

    // Flow 5: Context Entry
    console.log('📹 FLOW 5: Adding Context')
    await page.$eval('textarea#context', el => {
      el.value = 'Focus on professional achievements and experience. Tone should be formal and business-appropriate.'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(300)
    await captureFlow(page, 'flow-05-context', '01-context-added')

    // Flow 6: Ready to Process
    console.log('📹 FLOW 6: Form Complete - Ready to Process')
    await captureFlow(page, 'flow-06-ready', '01-all-filled-button-enabled')

    // Flow 7: Results Section
    console.log('📹 FLOW 7: Results Display Area')
    await captureFlow(page, 'flow-07-results', '01-results-empty-state')

    // Flow 8: Mobile View
    console.log('📹 FLOW 8: Mobile Responsiveness')
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'flow-08-responsive', '01-mobile-view')

    // Flow 9: Tablet View
    console.log('📹 FLOW 9: Tablet View')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'flow-09-responsive', '02-tablet-view')

    // Flow 10: Desktop View
    console.log('📹 FLOW 10: Desktop View')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'flow-10-responsive', '03-desktop-view')

    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL SCREENSHOTS CAPTURED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log(`📁 Location: ${SCREENSHOTS_DIR}/`)

    const files = fs.readdirSync(SCREENSHOTS_DIR).sort()
    console.log('\n📋 Screenshots captured:')
    files.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file}`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await browser.close()
  }
}

main()


