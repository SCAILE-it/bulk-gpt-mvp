/**
 * Script to apply storage RLS policies programmatically
 * Run with: node scripts/apply-storage-policies.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const { readFileSync } = require('fs')
const { join } = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyStoragePolicies() {
  console.log('🚀 Applying storage RLS policies...\n')

  try {
    const migrationPath = join(process.cwd(), 'supabase/migrations/004_create_storage_policies.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    // Extract individual CREATE POLICY statements
    const policyStatements = sql
      .split('CREATE POLICY')
      .slice(1) // Skip first empty part
      .map(s => 'CREATE POLICY' + s.split(';')[0])
      .map(s => s.trim())
      .filter(s => s.length > 0)

    console.log(`📋 Found ${policyStatements.length} policy statements\n`)

    for (const statement of policyStatements) {
      const policyNameMatch = statement.match(/"([^"]+)"/)
      const policyName = policyNameMatch ? policyNameMatch[1] : 'unknown'
      
      console.log(`  Creating policy: ${policyName}...`)
      
      // Execute SQL via Supabase REST API (using rpc or direct query)
      // Note: Supabase JS client doesn't have direct SQL execution, so we'll use fetch
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql: statement + ';' })
      }).catch(() => null)

      // Alternative: Use Supabase Management API or execute directly
      // For now, let's use a simpler approach - execute via SQL Editor instructions
      console.log(`  ⚠️  Policy creation requires SQL execution`)
      console.log(`  💡 Run this SQL in Supabase SQL Editor:\n`)
      console.log(statement + ';\n')
    }

    console.log('\n✅ Storage policies need to be applied manually via SQL Editor')
    console.log('📋 Or run the migration file: supabase/migrations/004_create_storage_policies.sql')
    console.log('\n🧪 After applying policies, test by uploading a file in Context → Files tab')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('\n💡 Please run the SQL migration manually in Supabase SQL Editor')
    process.exit(1)
  }
}

applyStoragePolicies()

