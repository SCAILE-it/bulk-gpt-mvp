import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkLatestBatch() {
  console.log('\n🔍 CHECKING LATEST BATCH STATUS\n')

  // Get test user
  const { data: userData } = await supabase.auth.admin.listUsers()
  const testUser = userData.users.find(u => u.email === 'test@bulkgpt.local')

  if (!testUser) {
    console.log('❌ Test user not found')
    return
  }

  console.log('✅ Test user ID:', testUser.id)

  // Get latest batch
  const { data: batches, error } = await supabase
    .from('batches')
    .select('id, status, total_rows, processed_rows, created_at, updated_at')
    .eq('user_id', testUser.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  if (!batches || batches.length === 0) {
    console.log('⚠️  No batches found')
    return
  }

  const batch = batches[0]
  console.log('\nLatest batch:', batch.id)
  console.log('Status:', batch.status)
  console.log('Progress:', `${batch.processed_rows || 0}/${batch.total_rows}`)
  console.log('Created:', batch.created_at)
  console.log('Updated:', batch.updated_at)

  // Get batch results
  const { data: results } = await supabase
    .from('batch_results')
    .select('id, status, error_message, output_data')
    .eq('batch_id', batch.id)
    .order('id', { ascending: true })

  console.log(`\nBatch results: ${results?.length || 0} rows\n`)

  if (results && results.length > 0) {
    results.forEach((r, i) => {
      console.log(`Row ${i + 1}: status=${r.status}`)
      if (r.error_message) {
        console.log(`  Error: ${r.error_message}`)
      }
      if (r.output_data) {
        const preview = JSON.stringify(r.output_data).substring(0, 60)
        console.log(`  Output: ${preview}...`)
      }
    })
  }
}

checkLatestBatch().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
