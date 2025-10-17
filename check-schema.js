// Check batch_results table structure
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ayjpnfzbxhcwwxvobssn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY0MjUxNSwiZXhwIjoyMDc2MjE4NTE1fQ.1BFcQeilNU0r0PVbuoOkl8TOy7XVeb6K-T5X5_fpA-s'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkSchema() {
  console.log('Testing batch_results insert...\n')
  
  // Try to insert a test row
  const testRow = {
    id: 'test-row-123',
    batch_id: 'test-batch',
    input: JSON.stringify({ test: 'data' }),
    status: 'pending',
    output: '',
    error: null
  }
  
  const { data, error } = await supabase
    .from('batch_results')
    .insert(testRow)
    .select()
  
  if (error) {
    console.log('❌ Insert failed:')
    console.log('   Code:', error.code)
    console.log('   Message:', error.message)
    console.log('   Details:', error.details)
    console.log('')
    
    // Try without 'error' column
    console.log('Trying without error column...')
    const { error: error2 } = await supabase
      .from('batch_results')
      .insert({
        id: 'test-row-124',
        batch_id: 'test-batch',
        input: JSON.stringify({ test: 'data' }),
        status: 'pending',
        output: ''
      })
      .select()
    
    if (error2) {
      console.log('❌ Still failed:', error2.message)
    } else {
      console.log('✅ Worked without error column!')
      console.log('   → Schema mismatch: table doesn\'t have error column')
    }
  } else {
    console.log('✅ Insert successful with error column')
    console.log('   Data:', data)
    
    // Clean up
    await supabase.from('batch_results').delete().eq('id', 'test-row-123')
  }
  
  // Clean up test rows
  await supabase.from('batch_results').delete().eq('batch_id', 'test-batch')
}

checkSchema()

