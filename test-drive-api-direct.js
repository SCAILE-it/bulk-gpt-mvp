/**
 * Direct test of Drive API to create Google Sheet from CSV
 * Tests if drive.file scope works for creating spreadsheets
 */

const fetch = require('node-fetch')

async function testDriveAPICreateSheet() {
  // You'll need to get an access token manually from OAuth flow
  // For testing, paste your access token here
  const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE'
  
  if (ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
    console.log('⚠️  Please set GOOGLE_ACCESS_TOKEN environment variable')
    console.log('   Or update this script with your access token')
    console.log('\n   To get an access token:')
    console.log('   1. Go to your app and click "Google Sheets" export')
    console.log('   2. Complete OAuth flow')
    console.log('   3. Check browser console for the token')
    console.log('   4. Run: GOOGLE_ACCESS_TOKEN=your_token node test-drive-api-direct.js')
    return
  }

  const title = `Test Sheet - ${new Date().toISOString()}`
  const csvContent = `Name,Email,Status
John Doe,john@example.com,Active
Jane Smith,jane@example.com,Active`

  const boundary = `----WebKitFormBoundary${Date.now()}`
  const metadata = JSON.stringify({
    name: title,
    mimeType: 'application/vnd.google-apps.spreadsheet',
  })
  
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: text/csv',
    '',
    csvContent,
    `--${boundary}--`,
  ].join('\r\n')

  console.log('Testing Drive API create sheet with CSV conversion...\n')
  console.log(`Title: ${title}`)
  console.log(`CSV Content:\n${csvContent}\n`)

  try {
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&convert=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    })

    const responseText = await response.text()
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      console.error('\n❌ Request failed!')
      console.error('Response:', responseText)
      try {
        const errorData = JSON.parse(responseText)
        console.error('Error details:', JSON.stringify(errorData, null, 2))
      } catch {
        console.error('Raw response:', responseText)
      }
      return
    }

    const result = JSON.parse(responseText)
    console.log('\n✅ Success!')
    console.log('Result:', JSON.stringify(result, null, 2))
    
    if (result.id) {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${result.id}/edit`
      console.log(`\n📊 Sheet URL: ${sheetUrl}`)
      console.log('\n✅ Test passed! Check your Google Drive for the new sheet.')
    } else {
      console.log('\n⚠️  Response missing "id" field')
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
  }
}

testDriveAPICreateSheet()

