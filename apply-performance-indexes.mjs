#!/usr/bin/env node

/**
 * Check and apply performance indexes migration
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
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

async function checkIndexes() {
  console.log('\n📊 Checking if performance indexes exist...\n')
  console.log('ℹ️  Note: Cannot check index existence via Supabase JS client')
  console.log('         Will provide instructions to apply migration\n')
  return { exists: false, error: null }
}

async function applyMigration() {
  console.log('\n🚀 Applying performance indexes migration...\n')

  // Read the migration file
  const sql = readFileSync('supabase/migrations/20251119000001_add_performance_indexes.sql', 'utf8')

  console.log('📝 Migration SQL loaded')
  console.log('━'.repeat(80))
  console.log('\n⚠️  Note: Supabase JS client cannot execute raw SQL directly.')
  console.log('          You need to apply this migration via Supabase Dashboard.\n')
  console.log('📋 To apply this migration:\n')
  console.log('1. Go to: https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn/sql/new')
  console.log('2. Copy the SQL below:')
  console.log('━'.repeat(80))
  console.log(sql)
  console.log('━'.repeat(80))
  console.log('\n3. Paste it into the SQL Editor')
  console.log('4. Click "RUN" to execute')
  console.log('\n💡 Alternatively, use Supabase CLI:')
  console.log('   supabase db push\n')
}

// Run the check and show instructions
checkIndexes()
  .then(() => applyMigration())
  .catch(err => {
    console.error('💥 Error:', err.message)
    process.exit(1)
  })
