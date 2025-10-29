/**
 * Debug script to check test@example.com user status and reset usage limits
 * Run with: npx tsx scripts/debug-test-user.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function debugTestUser() {
  console.log('🔍 Debugging test@example.com user...\n')

  // 1. Check if user exists in auth.users
  console.log('1. Checking auth.users table...')
  const { data: authData, error: authError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test@example.com')
    .maybeSingle()

  if (authError) {
    console.error('   ❌ Error querying auth.users:', authError.message)
  } else if (!authData) {
    console.log('   ⚠️  User NOT found in auth.users')
    console.log('   ℹ️  You may need to create this user via Supabase Auth')
  } else {
    console.log('   ✅ User found:', authData.id)
  }

  // Get user ID from auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('\n❌ Error listing users:', listError.message)
    return
  }

  const testUser = users.find(u => u.email === 'test@example.com')

  if (!testUser) {
    console.log('\n❌ test@example.com not found in auth system')
    console.log('   To create: Go to Supabase Dashboard → Authentication → Users → Add User')
    console.log('   Email: test@example.com')
    console.log('   Password: password')
    return
  }

  console.log('\n✅ Found user in auth:')
  console.log('   ID:', testUser.id)
  console.log('   Email:', testUser.email)
  console.log('   Created:', testUser.created_at)

  const userId = testUser.id

  // 2. Check user_usage table
  console.log('\n2. Checking user_usage table...')
  const { data: usageData, error: usageError } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (usageError) {
    console.error('   ❌ Error:', usageError.message)
  } else if (!usageData) {
    console.log('   ⚠️  No usage record found - creating one...')

    const { data: newUsage, error: insertError } = await supabase
      .from('user_usage')
      .insert({
        user_id: userId,
        period_start: new Date().toISOString(),
        batches_today: 0,
        rows_today: 0,
        batches_this_month: 0,
        rows_this_month: 0,
        total_batches: 0,
        total_rows: 0,
        plan_type: 'beta'
      })
      .select()
      .single()

    if (insertError) {
      console.error('   ❌ Failed to create usage record:', insertError.message)
    } else {
      console.log('   ✅ Created usage record')
    }
  } else {
    console.log('   ✅ Usage record found:')
    console.log('      Batches today:', usageData.batches_today, '/ 5')
    console.log('      Rows today:', usageData.rows_today, '/ 5000')
    console.log('      Batches this month:', usageData.batches_this_month)
    console.log('      Rows this month:', usageData.rows_this_month)
    console.log('      Total batches:', usageData.total_batches)
    console.log('      Total rows:', usageData.total_rows)
    console.log('      Plan:', usageData.plan_type)
    console.log('      Period start:', usageData.period_start)

    // Check if limits exceeded
    if (usageData.batches_today >= 5) {
      console.log('\n   ⚠️  DAILY BATCH LIMIT EXCEEDED!')
      console.log('   Resetting to 0...')

      const { error: resetError } = await supabase
        .from('user_usage')
        .update({
          batches_today: 0,
          rows_today: 0,
          period_start: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (resetError) {
        console.error('   ❌ Failed to reset:', resetError.message)
      } else {
        console.log('   ✅ Usage limits reset successfully!')
      }
    }
  }

  // 3. Check batches table
  console.log('\n3. Checking active batches...')
  const { data: batches, error: batchError } = await supabase
    .from('batches')
    .select('id, status, created_at, total_rows')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })

  if (batchError) {
    console.error('   ❌ Error:', batchError.message)
  } else if (!batches || batches.length === 0) {
    console.log('   ✅ No active batches')
  } else {
    console.log(`   ⚠️  ${batches.length} active batch(es):`)
    batches.forEach(batch => {
      console.log(`      - ${batch.id}: ${batch.status} (${batch.total_rows} rows)`)
    })
  }

  // 4. Test RPC function
  console.log('\n4. Testing check_usage_limits RPC function...')
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('check_usage_limits', { p_user_id: userId })
    .single()

  if (rpcError) {
    console.error('   ❌ RPC Error:', rpcError.message)
    console.log('   ℹ️  This might mean the database migration was not applied')
    console.log('   ℹ️  Run: npx supabase db push (if using local dev)')
    console.log('   ℹ️  Or check Supabase Dashboard → Database → Functions')
  } else {
    console.log('   ✅ RPC function works:')
    console.log('      Can process:', rpcData.can_process)
    console.log('      Reason:', rpcData.reason || 'N/A')
    console.log('      Batches today:', rpcData.batches_today, '/', rpcData.daily_batch_limit)
    console.log('      Rows today:', rpcData.rows_today, '/', rpcData.daily_row_limit)
  }

  console.log('\n✅ Diagnosis complete!')
  console.log('\nIf you see errors above, the test user may need:')
  console.log('   1. User account created in Supabase Auth')
  console.log('   2. Usage record initialized in user_usage table')
  console.log('   3. Database migration applied (check_usage_limits function)')
}

debugTestUser().catch(console.error)
