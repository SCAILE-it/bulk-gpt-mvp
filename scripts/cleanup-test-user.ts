/**
 * Cleanup script for test@example.com - resets usage and clears stuck batches
 * Run with: npx tsx scripts/cleanup-test-user.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupTestUser() {
  console.log('🧹 Cleaning up test@example.com...\n')

  // Get test user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error listing users:', listError.message)
    return
  }

  const testUser = users.find(u => u.email === 'test@example.com')

  if (!testUser) {
    console.log('❌ test@example.com not found')
    return
  }

  const userId = testUser.id
  console.log('✅ Found user:', userId)

  // 1. Mark all pending/processing batches as 'failed'
  console.log('\n1. Cleaning up stuck batches...')
  const { data: stuckBatches, error: queryError } = await supabase
    .from('batches')
    .select('id, status, created_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])

  if (queryError) {
    console.error('   ❌ Error querying batches:', queryError.message)
  } else if (!stuckBatches || stuckBatches.length === 0) {
    console.log('   ℹ️  No stuck batches found')
  } else {
    console.log(`   Found ${stuckBatches.length} stuck batch(es)`)

    const { error: updateError } = await supabase
      .from('batches')
      .update({
        status: 'failed',
        error: 'Batch timed out and was automatically cleaned up'
      })
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])

    if (updateError) {
      console.error('   ❌ Failed to update batches:', updateError.message)
    } else {
      console.log(`   ✅ Marked ${stuckBatches.length} batch(es) as failed`)
    }
  }

  // 2. Check if user_usage table exists and has the record
  console.log('\n2. Checking usage record...')
  const { data: usageData, error: usageError } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (usageError) {
    if (usageError.message.includes('relation') || usageError.message.includes('does not exist')) {
      console.log('   ⚠️  user_usage table does not exist yet')
      console.log('   ℹ️  Database migration needs to be applied')
      console.log('   ℹ️  Batches should still work (usage check will fail-open)')
    } else {
      console.error('   ❌ Error:', usageError.message)
    }
  } else if (!usageData) {
    console.log('   ℹ️  No usage record (will be created on first batch)')
  } else {
    console.log('   ✅ Usage record exists')

    // Try to reset usage limits
    try {
      const { error: resetError } = await supabase
        .from('user_usage')
        .update({
          batches_today: 0,
          rows_today: 0,
          batches_created_today: 0,
          rows_processed_today: 0,
          period_start: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (resetError) {
        console.log('   ⚠️  Could not reset usage (migration may not be applied):', resetError.message)
      } else {
        console.log('   ✅ Reset usage counters to 0')
      }
    } catch (e) {
      console.log('   ⚠️  Usage reset failed (expected if migration not applied)')
    }
  }

  console.log('\n✅ Cleanup complete!')
  console.log('\nThe test user should now be able to create new batches.')
  console.log('If you still see errors, check:')
  console.log('   1. Supabase Dashboard → Database → Migrations')
  console.log('   2. Apply migration: 20251029094229_api_keys_and_usage.sql')
  console.log('   3. Run: supabase db push --linked')
}

cleanupTestUser().catch(console.error)
