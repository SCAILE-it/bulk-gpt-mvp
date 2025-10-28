import { createClient } from '@supabase/supabase-js'

async function checkOrphanedBatches() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing Supabase credentials')
    console.log('Run: source .env.local && npx tsx scripts/check-orphaned-batches.ts')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('\n🔍 CHECKING FOR ORPHANED BATCHES\n')

  // Get test user ID
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers()

  if (userError) {
    console.log('❌ Could not fetch users:', userError.message)
    return
  }

  const testUser = userData.users.find(u => u.email === 'test@bulkgpt.local')

  if (!testUser) {
    console.log('❌ Test user not found (test@bulkgpt.local)')
    return
  }

  console.log(`✅ Test user ID: ${testUser.id}`)

  // Find stuck batches
  const { data: batches, error: batchError} = await supabase
    .from('batches')
    .select('id, status, created_at, updated_at, total_rows, processed_rows')
    .eq('user_id', testUser.id)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })

  if (batchError) {
    console.log('❌ Error fetching batches:', batchError.message)
    return
  }

  console.log(`\n📊 Found ${batches?.length || 0} stuck batches:\n`)

  if (!batches || batches.length === 0) {
    console.log('✅ No stuck batches found!')
    return
  }

  batches.forEach((batch, i) => {
    const createdAgo = (Date.now() - new Date(batch.created_at).getTime()) / 1000 / 60
    console.log(`${i + 1}. ${batch.id}`)
    console.log(`   Status: ${batch.status}`)
    console.log(`   Progress: ${batch.processed_rows || 0}/${batch.total_rows}`)
    console.log(`   Created: ${createdAgo.toFixed(1)} minutes ago`)
    console.log(`   Updated: ${batch.updated_at}`)
    console.log()
  })

  // Clean up batches older than 10 minutes
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const staleBatches = batches.filter(b => b.created_at < staleThreshold)

  if (staleBatches.length > 0) {
    console.log(`\n🧹 Cleaning up ${staleBatches.length} stale batches (>10 min old)...\n`)

    for (const batch of staleBatches) {
      const { error: updateError } = await supabase
        .from('batches')
        .update({
          status: 'failed'
        })
        .eq('id', batch.id)

      if (updateError) {
        console.log(`❌ Failed to clean ${batch.id}:`, updateError.message)
      } else {
        console.log(`✅ Cleaned ${batch.id}`)
      }
    }
  }

  console.log('\n✅ Cleanup complete!')
}

checkOrphanedBatches().catch(err => {
  console.error('❌ Script failed:', err)
  process.exit(1)
})
