// Verify and fix database schema
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ayjpnfzbxhcwwxvobssn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY0MjUxNSwiZXhwIjoyMDc2MjE4NTE1fQ.1BFcQeilNU0r0PVbuoOkl8TOy7XVeb6K-T5X5_fpA-s'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifySchema() {
  console.log('Checking database schema...\n')
  
  // Check batches table
  console.log('1. Checking batches table...')
  const { data: batches, error: batchesErr } = await supabase
    .from('batches')
    .select('*')
    .limit(1)
  
  if (batchesErr) {
    console.log('❌ batches table:', batchesErr.message)
  } else {
    console.log('✅ batches table exists')
  }
  
  // Check batch_results table
  console.log('2. Checking batch_results table...')
  const { data: results, error: resultsErr } = await supabase
    .from('batch_results')
    .select('*')
    .limit(1)
  
  if (resultsErr) {
    console.log('❌ batch_results table:', resultsErr.message)
    console.log('   Full error:', resultsErr)
  } else {
    console.log('✅ batch_results table exists')
  }
  
  // Check users table
  console.log('3. Checking users table...')
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('*')
    .limit(1)
  
  if (usersErr) {
    console.log('❌ users table:', usersErr.message)
  } else {
    console.log('✅ users table exists')
  }
  
  console.log('\n--- Summary ---')
  if (batchesErr || resultsErr || usersErr) {
    console.log('❌ Schema issues found. Run the SQL from SUPABASE_NEW_PROJECT_SETUP.md')
  } else {
    console.log('✅ All tables exist and are accessible')
  }
}

verifySchema()

