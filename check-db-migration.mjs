#!/usr/bin/env node

/**
 * Check if check_usage_limits RPC function exists in production database
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  console.error('\nPlease check .env.local file')
  process.exit(1)
}

console.log('🔍 Connecting to Supabase...')
console.log('📍 URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkMigration() {
  console.log('\n📊 Checking if check_usage_limits RPC function exists...\n')

  // Check if function exists
  const { data: functions, error: funcError } = await supabase
    .rpc('pg_catalog.pg_proc', {})
    .select('proname')
    .eq('proname', 'check_usage_limits')
    .limit(1)

  // Alternative: Try calling the function directly
  console.log('🧪 Attempting to call check_usage_limits function...')

  const testUserId = '16212508-50d4-43be-bff2-51e4a26e07b4' // From error log

  const { data, error } = await supabase
    .rpc('check_usage_limits', { p_user_id: testUserId })

  console.log('\n📋 Results:\n')

  if (error) {
    console.error('❌ Function call failed!')
    console.error('Error:', JSON.stringify(error, null, 2))

    if (error.code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('does not exist')) {
      console.error('\n🚨 DIAGNOSIS: check_usage_limits RPC function does NOT exist in database')
      console.error('📝 ACTION REQUIRED: Apply migration 20251029094229_api_keys_and_usage.sql')
      process.exit(1)
    } else {
      console.error('\n⚠️  DIAGNOSIS: Function may exist but failed for another reason')
      console.error('📝 Check RLS policies, permissions, or function logic')
      process.exit(1)
    }
  } else {
    console.log('✅ Function call succeeded!')
    console.log('📊 Function output:', JSON.stringify(data, null, 2))
    console.log('\n✅ DIAGNOSIS: check_usage_limits RPC function EXISTS and is working')
    console.log('📝 Database migration is applied correctly')

    // Also check user_usage table
    console.log('\n🔍 Checking user_usage table...')
    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', testUserId)
      .limit(1)

    if (usageError) {
      console.error('⚠️  Could not check user_usage table:', usageError.message)
    } else {
      console.log('✅ user_usage table accessible')
      if (usageData && usageData.length > 0) {
        console.log('📊 User usage record:', JSON.stringify(usageData[0], null, 2))
      } else {
        console.log('ℹ️  No usage record found (will be auto-created on first use)')
      }
    }

    process.exit(0)
  }
}

// Run the check
checkMigration().catch(err => {
  console.error('💥 Unexpected error:', err)
  process.exit(1)
})
