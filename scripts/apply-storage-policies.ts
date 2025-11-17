/**
 * Script to apply storage RLS policies programmatically
 * Run with: npx tsx scripts/apply-storage-policies.ts
 */

import { supabaseAdmin } from '../lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyStoragePolicies() {
  console.log('🚀 Applying storage RLS policies...\n')

  try {
    const migrationPath = join(process.cwd(), 'supabase/migrations/004_create_storage_policies.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    // Split SQL into individual statements (simple approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📋 Found ${statements.length} policy statements\n`)

    for (const statement of statements) {
      if (statement.includes('CREATE POLICY')) {
        const policyName = statement.match(/CREATE POLICY IF NOT EXISTS "([^"]+)"/)?.[1] || 
                          statement.match(/CREATE POLICY "([^"]+)"/)?.[1] || 
                          'unknown'
        console.log(`  Creating policy: ${policyName}...`)
        
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: statement + ';' })
        
        if (error) {
          // Check if policy already exists
          if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
            console.log(`  ✅ Policy "${policyName}" already exists`)
          } else {
            throw error
          }
        } else {
          console.log(`  ✅ Policy "${policyName}" created`)
        }
      }
    }

    console.log('\n✅ Storage policies applied successfully!')
    console.log('\n🧪 Test by uploading a file in Context → Files tab')

  } catch (error) {
    console.error('❌ Error applying policies:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('\n💡 Tip: You can also run the SQL migration manually in Supabase SQL Editor')
    }
    process.exit(1)
  }
}

applyStoragePolicies()

