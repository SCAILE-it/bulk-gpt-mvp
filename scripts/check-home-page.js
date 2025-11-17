/**
 * Playwright script to check home page layout and data
 */

const { chromium } = require('playwright')

async function checkHomePage() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    console.log('Navigating to http://localhost:3000/home...\n')
    await page.goto('http://localhost:3000/home', { waitUntil: 'networkidle', timeout: 30000 })
    
    // Wait for content to load
    await page.waitForTimeout(5000)
    
    console.log('Checking page elements...\n')
    
    // Check if CSV demo is on the left
    const csvDemo = await page.$('.absolute.left-8')
    const csvDemoPosition = csvDemo ? await csvDemo.boundingBox() : null
    
    // Check if terminal feed is on the right with margin
    const terminalFeed = await page.$('.ml-\\[580px\\]')
    const terminalPosition = terminalFeed ? await terminalFeed.boundingBox() : null
    
    // Get CSV demo content
    const csvFilename = csvDemo ? await csvDemo.$eval('.font-mono', el => el.textContent.trim()).catch(() => null) : null
    const csvRows = csvDemo ? await csvDemo.$$eval('[class*="grid"]:not(:first-child)', rows => 
      rows.map(row => {
        const cells = row.querySelectorAll('div')
        return {
          name: cells[0]?.textContent?.trim() || '',
          description: cells[1]?.textContent?.trim() || '',
          summary: cells[2]?.textContent?.trim() || ''
        }
      })
    ).catch(() => []) : []
    
    // Check terminal feed visibility
    const terminalContent = terminalFeed ? await terminalFeed.textContent().catch(() => '') : ''
    const hasProcessingLog = terminalContent.includes('processing.log')
    const hasCompletedBatches = terminalContent.includes('READY FOR REVIEW')
    
    console.log('=== Layout Check ===')
    console.log(`CSV Demo Position: ${csvDemoPosition ? `Left ${csvDemoPosition.x}px, Top ${csvDemoPosition.y}px` : 'NOT FOUND'}`)
    console.log(`Terminal Feed Position: ${terminalPosition ? `Left ${terminalPosition.x}px, Top ${terminalPosition.y}px` : 'NOT FOUND'}`)
    console.log(`Terminal Feed Width: ${terminalPosition ? `${terminalPosition.width}px` : 'N/A'}`)
    
    if (csvDemoPosition && terminalPosition) {
      const overlap = csvDemoPosition.x + csvDemoPosition.width > terminalPosition.x
      console.log(`Overlap Check: ${overlap ? '⚠️ OVERLAPPING' : '✅ NO OVERLAP'}`)
      console.log(`Spacing: ${terminalPosition.x - (csvDemoPosition.x + csvDemoPosition.width)}px`)
    }
    
    console.log('\n=== CSV Demo Content ===')
    console.log(`Filename: ${csvFilename || 'NOT FOUND'}`)
    console.log(`Row Count: ${csvRows.length}`)
    
    if (csvRows.length > 0) {
      console.log('\nFirst 3 rows:')
      csvRows.slice(0, 3).forEach((row, idx) => {
        console.log(`\nRow ${idx + 1}:`)
        console.log(`  Name: ${row.name}`)
        console.log(`  Description: ${row.description.substring(0, 60)}...`)
        console.log(`  Summary: ${row.summary.substring(0, 60)}...`)
      })
      
      // Check if it's demo data
      const isDemo = csvRows.some(r => 
        r.name === 'John Doe' || r.name === 'Jane Smith' || r.name === 'Mike Johnson'
      )
      console.log(`\nData Type: ${isDemo ? '⚠️ DEMO DATA (John Doe/Jane Smith/Mike Johnson)' : '✅ REAL DATA'}`)
    }
    
    console.log('\n=== Terminal Feed ===')
    console.log(`Visible: ${hasProcessingLog ? '✅' : '❌'}`)
    console.log(`Has Completed Batches: ${hasCompletedBatches ? '✅' : '❌'}`)
    
    // Take screenshot
    await page.screenshot({ 
      path: '/tmp/home-page-check.png', 
      fullPage: true 
    })
    console.log('\n✅ Screenshot saved to /tmp/home-page-check.png')
    
  } catch (error) {
    console.error('Error:', error.message)
    await page.screenshot({ 
      path: '/tmp/home-page-error.png', 
      fullPage: true 
    })
    console.log('Error screenshot saved to /tmp/home-page-error.png')
  } finally {
    await browser.close()
  }
}

checkHomePage()

