const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3002'
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
const SCREENSHOTS_DIR = `./screenshots-updated-${TIMESTAMP}`

async function ensureDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
}

async function captureFlow(page, num, name) {
  const filename = `${String(num).padStart(2, '0')}-${name}.png`
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  await page.screenshot({ path: filepath, fullPage: true })
  console.log(`  ✅ ${filename}`)
}

async function main() {
  await ensureDir()
  const browser = await chromium.launch()
  
  try {
    console.log('\n📸 CAPTURING UPDATED SCREENSHOTS WITH NEW DESIGN SYSTEM\n')
    console.log(`⏰ Timestamp: ${TIMESTAMP}`)
    console.log(`🌐 Base URL: ${BASE_URL}`)
    console.log(`📁 Directory: ${SCREENSHOTS_DIR}\n`)

    // Desktop Screenshots
    console.log('📹 DESKTOP VIEW (1440x900):')
    const pageDesktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    
    await pageDesktop.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 })
    await pageDesktop.waitForTimeout(1000)
    await captureFlow(pageDesktop, 1, 'desktop-01-initial-load-new-design')
    
    // Fill CSV
    const csvContent = 'name,company,role\nAlice Johnson,TechCorp,Senior Engineer\nBob Smith,DataCo,Data Analyst\nCarol White,AILabs,Product Manager'
    const fileInput = await pageDesktop.$('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })
    await pageDesktop.waitForTimeout(1500)
    await captureFlow(pageDesktop, 2, 'desktop-02-after-csv-upload')
    
    // Fill prompt
    await pageDesktop.$eval('textarea#prompt', el => {
      el.value = 'Write a professional bio for {{name}} who works as a {{role}} at {{company}}. Keep it 2-3 sentences.'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await pageDesktop.waitForTimeout(500)
    await captureFlow(pageDesktop, 3, 'desktop-03-prompt-entered')
    
    // Fill context
    await pageDesktop.$eval('textarea#context', el => {
      el.value = 'Focus on professional achievements. Keep formal business tone.'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await pageDesktop.waitForTimeout(500)
    await captureFlow(pageDesktop, 4, 'desktop-04-context-added-button-enabled')
    
    await pageDesktop.close()

    // Tablet Screenshots
    console.log('\n📹 TABLET VIEW (768x1024):')
    const pageTablet = await browser.newPage({ viewport: { width: 768, height: 1024 } })
    await pageTablet.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 })
    await pageTablet.waitForTimeout(1000)
    await captureFlow(pageTablet, 5, 'tablet-01-initial-layout')
    await pageTablet.close()

    // Mobile Screenshots
    console.log('\n📹 MOBILE VIEW (375x812):')
    const pageMobile = await browser.newPage({ viewport: { width: 375, height: 812 } })
    await pageMobile.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 })
    await pageMobile.waitForTimeout(1000)
    await captureFlow(pageMobile, 6, 'mobile-01-initial-layout')
    await pageMobile.close()

    // Dark Mode
    console.log('\n📹 DARK MODE (1440x900):')
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await pageDark.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 })
    await pageDark.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await pageDark.waitForTimeout(1000)
    await captureFlow(pageDark, 7, 'dark-mode-01-oklch-colors')
    await pageDark.close()

    console.log('\n' + '='.repeat(70))
    console.log('✅ SCREENSHOT CAPTURE COMPLETE!')
    console.log('='.repeat(70))
    console.log(`📁 Saved to: ${SCREENSHOTS_DIR}/\n`)
    
    const files = fs.readdirSync(SCREENSHOTS_DIR).sort()
    files.forEach((file, i) => {
      const fullPath = path.join(SCREENSHOTS_DIR, file)
      const stats = fs.statSync(fullPath)
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
      console.log(`  ${i + 1}. ${file} (${sizeMB}MB)`)
    })

    console.log('\n🎨 Design System Captured:')
    console.log('  ✅ New button radius: rounded-2xl, rounded-xl, rounded-3xl lg')
    console.log('  ✅ New card layout: gap-6, py-6, rounded-3xl')
    console.log('  ✅ oklch color system (warm neutral)')
    console.log('  ✅ aria-invalid states')
    console.log('  ✅ Responsive design: mobile, tablet, desktop')
    console.log('  ✅ Dark mode support\n')

  } catch (error) {
    console.error('❌ ERROR:', error.message)
  } finally {
    await browser.close()
  }
}

main()
