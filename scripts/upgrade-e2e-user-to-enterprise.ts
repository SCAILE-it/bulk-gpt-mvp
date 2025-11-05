// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'

const E2E_TEST_EMAIL = 'e2e-test-1762354355023@bulkgpt.local'

// Create Supabase admin client after loading env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function upgradeE2EUser() {
  console.log('🔍 Finding E2E test user:', E2E_TEST_EMAIL)

  // Find user ID by email
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()

  if (userError) {
    console.error('❌ Failed to fetch users:', userError)
    process.exit(1)
  }

  const e2eUser = userData.users.find(user => user.email === E2E_TEST_EMAIL)

  if (!e2eUser) {
    console.error('❌ E2E test user not found:', E2E_TEST_EMAIL)
    console.log('Available users:', userData.users.map(u => u.email))
    process.exit(1)
  }

  console.log('✅ Found user ID:', e2eUser.id)

  // Upgrade to enterprise plan and reset usage
  console.log('🚀 Upgrading to enterprise plan and resetting usage...')

  const { data, error } = await supabaseAdmin
    .from('user_usage')
    .update({
      plan_type: 'enterprise',
      batches_created_today: 0,
      rows_processed_today: 0,
      period_start: new Date().toISOString().split('T')[0] // Today's date
    })
    .eq('user_id', e2eUser.id)
    .select()

  if (error) {
    console.error('❌ Failed to upgrade user:', error)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No user_usage record found, creating one...')

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('user_usage')
      .insert({
        user_id: e2eUser.id,
        plan_type: 'enterprise',
        batches_created_today: 0,
        rows_processed_today: 0,
        period_start: new Date().toISOString().split('T')[0]
      })
      .select()

    if (insertError) {
      console.error('❌ Failed to create user_usage record:', insertError)
      process.exit(1)
    }

    console.log('✅ Created user_usage record:', insertData)
  } else {
    console.log('✅ User upgraded successfully!')
    console.log('Data:', data)
  }

  console.log('\n📊 New Plan Limits:')
  console.log('  - Plan: enterprise')
  console.log('  - Daily batches: 9999')
  console.log('  - Daily rows: 9999999')
  console.log('\n🎉 E2E test user is ready for unlimited testing!')
}

upgradeE2EUser()
