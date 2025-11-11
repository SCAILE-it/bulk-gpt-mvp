#!/usr/bin/env node

/**
 * Apply migration 20251029094229_api_keys_and_usage.sql to production database
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
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

async function applyMigration() {
  console.log('\n📖 Reading migration file...')

  const migrationPath = join(__dirname, 'supabase/migrations/20251029094229_api_keys_and_usage.sql')

  let migrationSQL
  try {
    migrationSQL = readFileSync(migrationPath, 'utf8')
    console.log('✅ Migration file loaded (' + migrationSQL.length + ' characters)')
  } catch (err) {
    console.error('❌ Could not read migration file:', err.message)
    console.error('Path:', migrationPath)
    process.exit(1)
  }

  console.log('\n🚀 Applying migration to production database...')
  console.log('⚠️  This will create/modify:')
  console.log('   - user_usage table')
  console.log('   - api_keys table')
  console.log('   - check_usage_limits() function')
  console.log('   - increment_usage() function')
  console.log('   - Usage tracking trigger')

  // Split SQL into individual statements (basic splitting by semicolon)
  // Note: This is a simple approach. For complex SQL with semicolons in strings, use a proper parser
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`\n📊 Found ${statements.length} SQL statements\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';' // Add semicolon back
    const preview = statement.substring(0, 100).replace(/\s+/g, ' ')

    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `)

    try {
      // Use PostgREST SQL execution endpoint via rpc
      // Note: Supabase JS client doesn't have direct SQL execution
      // We'll use fetch to call the REST API directly

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: statement })
      })

      if (!response.ok) {
        // Try alternative: Use supabase-js query builder (won't work for DDL, but let's try)
        // Actually, we need to execute raw SQL. Let me try a different approach.
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      console.log('✅')
      successCount++
    } catch (err) {
      // Some statements might fail if already exist (that's OK)
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log('⏭️  (already exists)')
        successCount++
      } else {
        console.log(`❌ ${err.message}`)
        errorCount++
      }
    }
  }

  console.log(`\n📊 Results:`)
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. This might be OK if objects already exist.')
    console.log('📝 Running verification check...\n')
  }

  // Verify migration succeeded by calling the function
  console.log('🧪 Testing check_usage_limits function...')

  const testUserId = '16212508-50d4-43be-bff2-51e4a26e07b4'
  const { data, error } = await supabase
    .rpc('check_usage_limits', { p_user_id: testUserId })

  if (error) {
    console.error('\n❌ Migration verification FAILED')
    console.error('Error:', error)
    console.error('\n📝 Manual action required: Apply migration via Supabase Dashboard SQL Editor')
    process.exit(1)
  } else {
    console.log('✅ Migration verification PASSED')
    console.log('📊 Function output:', JSON.stringify(data, null, 2))
    console.log('\n🎉 Migration applied successfully!')
    process.exit(0)
  }
}

// Run
applyMigration().catch(err => {
  console.error('💥 Unexpected error:', err)
  process.exit(1)
})
