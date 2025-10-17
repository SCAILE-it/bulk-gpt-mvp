// End-to-end test of Bulk GPT MVP
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ayjpnfzbxhcwwxvobssn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDI1MTUsImV4cCI6MjA3NjIxODUxNX0.Z5UGim-MMeby07bNadd9ooS4JMmTQp32ytPCzRteeFE'

async function testE2E() {
  console.log('🧪 BULK-GPT MVP - END-TO-END TEST')
  console.log('=' .repeat(50))
  console.log('')
  
  // Step 1: Auth
  console.log('1️⃣  Testing Authentication...')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  })
  
  if (authError || !authData.session) {
    console.log('❌ Auth failed:', authError?.message)
    return
  }
  
  console.log('✅ Logged in as:', authData.user.email)
  console.log('')
  
  // Step 2: Create batch
  console.log('2️⃣  Creating batch...')
  const testData = {
    csvFilename: 'test-e2e.csv',
    rows: [
      { name: 'Alice', company: 'TechCorp', role: 'Engineer' },
      { name: 'Bob', company: 'DataInc', role: 'Analyst' }
    ],
    prompt: 'Write a brief professional introduction for {{name}}, who works as a {{role}} at {{company}}',
    context: 'Keep it under 50 words and professional',
    outputColumns: ['introduction']
  }
  
  const response = await fetch('http://localhost:5005/api/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
    },
    body: JSON.stringify(testData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    console.log('❌ Batch creation failed:', error)
    return
  }
  
  const batchData = await response.json()
  console.log('✅ Batch created:', batchData.batchId)
  console.log('   Status:', batchData.status)
  console.log('   Total rows:', batchData.totalRows)
  console.log('')
  
  // Step 3: Poll for results
  console.log('3️⃣  Waiting for processing...')
  const batchId = batchData.batchId
  let attempts = 0
  const maxAttempts = 30 // 30 seconds
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    attempts++
    
    const statusResponse = await fetch(`http://localhost:5005/api/batch/${batchId}/status`, {
      headers: {
        'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
      }
    })
    
    const statusData = await statusResponse.json()
    
    process.stdout.write(`\r   Attempt ${attempts}/${maxAttempts}: ${statusData.status} (${statusData.progressPercent}%) - ${statusData.processedRows}/${statusData.totalRows} rows`)
    
    if (statusData.status === 'completed' || statusData.status === 'completed_with_errors') {
      console.log('\n')
      console.log('✅ Processing complete!')
      console.log('   Processed:', statusData.processedRows, 'rows')
      console.log('   Progress:', statusData.progressPercent + '%')
      console.log('')
      
      // Show results
      if (statusData.results && statusData.results.length > 0) {
        console.log('4️⃣  Results:')
        statusData.results.forEach((result, i) => {
          console.log(`\n   Row ${i + 1} (${result.status}):`)
          console.log('   Input:', JSON.stringify(result.input))
          console.log('   Output:', result.output || '(empty)')
          if (result.error) {
            console.log('   Error:', result.error)
          }
        })
      } else {
        console.log('⚠️  No results returned')
      }
      
      console.log('')
      console.log('=' .repeat(50))
      console.log('🎉 END-TO-END TEST COMPLETE!')
      return
    }
    
    if (statusData.status === 'failed') {
      console.log('\n')
      console.log('❌ Batch failed:', statusData.message)
      return
    }
  }
  
  console.log('\n')
  console.log('⏱️  Timeout: Processing took longer than 30 seconds')
  console.log('   This may be normal for the first run (cold start)')
}

testE2E().catch(err => {
  console.error('❌ Test failed:', err.message)
  process.exit(1)
})

