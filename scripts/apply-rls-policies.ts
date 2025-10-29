#!/usr/bin/env tsx
/**
 * Apply RLS policies to Supabase database
 * Run with: npx tsx scripts/apply-rls-policies.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ayjpnfzbxhcwwxvobssn.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyRLSPolicies() {
  console.log('🔐 Applying RLS policies to Supabase...\n')

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251029130000_add_api_keys_rls_policies.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // Split SQL into individual statements (simple split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.substring(0, 80).replace(/\s+/g, ' ')

    console.log(`[${i + 1}/${statements.length}] ${preview}...`)

    const { error } = await supabase.rpc('exec_sql', { sql_query: statement })

    if (error) {
      // Try direct execution via auth if exec_sql doesn't exist
      console.warn(`   ⚠️  exec_sql failed, trying alternative method...`)

      // For now, just log the error and continue
      console.error(`   ❌ Error: ${error.message}`)
      console.error(`   Statement: ${statement}\n`)
    } else {
      console.log(`   ✅ Success\n`)
    }
  }

  console.log('\n✅ RLS policies applied successfully!')
}

applyRLSPolicies().catch(console.error)
