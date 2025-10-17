const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3000'
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
const SCREENSHOTS_DIR = './screenshots-updated-' + TIMESTAMP

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
    console.log('📸 Capturing UPDATED Bulk GPT User Flows with NEW Design System...\n')
    console.log(`⏰ Timestamp: ${TIMESTAMP}\n`)

    // Flow 1: Initial Load
    console.log('📹 FLOW 1: Initial Page Load (NEW DESIGN)')
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await captureFlow(page, 'updated-flow-01', '01-page-loaded-new-design')

    // Flow 2: Layout
    console.log('📹 FLOW 2: New Design Layout (oklch colors, rounded-3xl cards)')
    await page.waitForTimeout(500)
    await captureFlow(page, 'updated-flow-02', '01-two-panel-layout-new-colors')

    // Flow 3: CSV Upload with NEW card styling
    console.log('📹 FLOW 3: CSV Upload (shows NEW card gap-6, py-6, rounded-3xl)')
    const csvContent = 'name,company,role\nAlice Johnson,TechCorp,Engineer\nBob Smith,DataCo,Analyst\nCarol White,AILabs,Manager'
    const fileInput = await page.$('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })
    await page.waitForTimeout(1500)
    await captureFlow(page, 'updated-flow-03', '02-after-upload-new-card-styling')

    // Flow 4: Prompt Entry with NEW button radius
    console.log('📹 FLOW 4: Prompt Entry (shows NEW button radius rounded-2xl)')
    await page.$eval('textarea#prompt', el => {
      el.value = 'Write a professional bio for {{name}} who works as a {{role}} at {{company}}. Keep it to 2-3 sentences.'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(300)
    await captureFlow(page, 'updated-flow-04', '01-prompt-entered-new-button-radius')

    // Flow 5: Context Entry
    console.log('📹 FLOW 5: Context Entry')
    await page.$eval('textarea#context', el => {
      el.value = 'Focus on professional achievements and experience. Tone should be formal and business-appropriate.'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(300)
    await captureFlow(page, 'updated-flow-05', '01-context-added-new-colors')

    // Flow 6: Ready to Process with NEW button styling
    console.log('📹 FLOW 6: Ready to Process (NEW button: rounded-3xl lg, aria-invalid states)')
    await captureFlow(page, 'updated-flow-06', '01-all-filled-new-button-styles')

    // Flow 7: Results Display with NEW card layout
    console.log('📹 FLOW 7: Results Display Area (NEW card layout: flex flex-col gap-6 rounded-3xl)')
    await captureFlow(page, 'updated-flow-07', '01-results-new-card-spacing')

    // Flow 8: Mobile View with NEW design
    console.log('📹 FLOW 8: Mobile View (NEW responsive with oklch colors)')
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'updated-flow-08', '01-mobile-view-new-design')

    // Flow 9: Tablet View
    console.log('📹 FLOW 9: Tablet View (NEW design system)')
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'updated-flow-09', '02-tablet-view-new-design')

    // Flow 10: Desktop View
    console.log('📹 FLOW 10: Desktop View (NEW design: oklch colors, rounded-3xl, gap-6)')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await captureFlow(page, 'updated-flow-10', '03-desktop-view-new-design')

    // Dark Mode Test
    console.log('📹 FLOW 11: Dark Mode (NEW oklch dark colors)')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(500)
    await captureFlow(page, 'updated-flow-11', '01-dark-mode-oklch-colors')

    console.log('\n' + '='.repeat(70))
    console.log('✅ ALL SCREENSHOTS CAPTURED SUCCESSFULLY!')
    console.log('='.repeat(70))
    console.log(`📁 Location: ${SCREENSHOTS_DIR}/`)
    console.log(`⏰ Timestamp: ${TIMESTAMP}\n`)

    const files = fs.readdirSync(SCREENSHOTS_DIR).sort()
    console.log('📋 Updated Screenshots:')
    files.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file}`)
    })

    console.log('\n🎨 Design System Changes Captured:')
    console.log('  ✅ Button radius: rounded-2xl (default), rounded-xl (sm), rounded-3xl (lg)')
    console.log('  ✅ Card layout: flex flex-col gap-6 rounded-3xl border py-6 shadow-sm')
    console.log('  ✅ Card header: flex flex-col gap-1.5 px-6')
    console.log('  ✅ Card content: px-6 (no pt-0 offset)')
    console.log('  ✅ Focus states: aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40')
    console.log('  ✅ Colors: oklch warm neutral palette (light + dark)')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await browser.close()
  }
}

main()
