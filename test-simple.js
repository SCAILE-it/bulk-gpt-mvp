// Simple API test - checks if Modal actually processes
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ayjpnfzbxhcwwxvobssn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY0MjUxNSwiZXhwIjoyMDc2MjE4NTE1fQ.1BFcQeilNU0r0PVbuoOkl8TOy7XVeb6K-T5X5_fpA-s'

async function testModalDirectly() {
  console.log('🧪 Testing Modal Processor Directly')
  console.log('=' .repeat(50))
  console.log('')
  
  const testBatch = {
    batch_id: `test_${Date.now()}`,
    rows: [
      { name: 'Alice', company: 'TechCorp' }
    ],
    prompt: 'Say hello to {{name}} from {{company}}',
    context: 'Be brief',
    output_schema: ['greeting']
  }
  
  console.log('1️⃣  Calling Modal endpoint...')
  console.log('   URL: https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run')
  console.log('   Batch ID:', testBatch.batch_id)
  console.log('')
  
  try {
    const response = await fetch('https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBatch)
    })
    
    console.log('   Response status:', response.status)
    
    if (!response.ok) {
      const text = await response.text()
      console.log('❌ Modal returned error:', text)
      return
    }
    
    const data = await response.json()
    console.log('✅ Modal accepted request')
    console.log('   Response:', JSON.stringify(data, null, 2))
    console.log('')
    
    // Check Supabase for batch status
    console.log('2️⃣  Checking Supabase for results...')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Wait a bit for processing
    console.log('   Waiting 10 seconds for processing...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    const { data: batch } = await supabase
      .from('batches')
      .select('*')
      .eq('id', testBatch.batch_id)
      .single()
    
    if (batch) {
      console.log('✅ Batch found in database')
      console.log('   Status:', batch.status)
      console.log('   Processed rows:', batch.processed_rows)
      console.log('')
      
      // Get results
      const { data: results } = await supabase
        .from('batch_results')
        .select('*')
        .eq('batch_id', testBatch.batch_id)
      
      if (results && results.length > 0) {
        console.log('3️⃣  Results:')
        results.forEach((r, i) => {
          console.log(`\n   Row ${i + 1}:`)
          console.log('   Status:', r.status)
          console.log('   Output:', r.output || '(no output)')
          if (r.error) console.log('   Error:', r.error)
        })
        console.log('')
        console.log('🎉 FULL FLOW WORKING!')
      } else {
        console.log('⚠️  No results in database yet')
        console.log('   Batch status:', batch.status)
      }
    } else {
      console.log('⚠️  Batch not found in database')
    }
    
  } catch (err) {
    console.log('❌ Error:', err.message)
  }
  
  console.log('')
  console.log('=' .repeat(50))
}

testModalDirectly()

