#!/usr/bin/env node
/**
 * Quick migration status checker
 * Uses Supabase client to check which tables exist
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase env variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const migrations = [
  { name: 'resources', file: '20250115000000_create_resources.sql' },
  { name: 'business_contexts', file: '20250115000001_create_business_contexts.sql' },
  { name: 'agent_definitions', file: '20250115000002_create_agent_definitions.sql' },
  { name: 'batches.agent_id', file: '20250115000003_add_agent_id_to_batches.sql', isColumn: true, table: 'batches', column: 'agent_id' },
  { name: 'user_profiles', file: '20250115000004_create_user_profiles.sql' },
  { name: 'agency_packages', file: '20250115000005_create_agency_packages.sql' },
  { name: 'client_package_assignments', file: '20250115000006_create_client_package_assignments.sql' },
  { name: 'package_runs', file: '20250115000007_create_package_runs.sql' },
  { name: 'usage_tracking', file: '20250115000008_create_usage_tracking.sql' },
  { name: 'invoices', file: '20250115000009_create_invoices.sql' },
  { name: 'invoice_items', file: '20250115000010_create_invoice_items.sql' },
  { name: 'agent_definitions.enabled', file: '20250115000011_add_enabled_to_agent_definitions.sql', isColumn: true, table: 'agent_definitions', column: 'enabled' },
]

async function checkMigrations() {
  console.log('🔍 Checking migration status...\n')
  
  const results = []
  
  for (const migration of migrations) {
    let exists = false
    
    if (migration.isColumn) {
      // Check column exists by trying to query it
      const { error } = await supabase
        .from(migration.table)
        .select(migration.column)
        .limit(0)
      
      exists = !error || error.code !== '42703' // 42703 = column does not exist
    } else {
      // Check table exists by trying to query it
      const { error } = await supabase
        .from(migration.name)
        .select('*')
        .limit(0)
      
      exists = !error || error.code !== '42P01' // 42P01 = relation does not exist
    }
    
    results.push({
      ...migration,
      exists,
      status: exists ? '✅ EXISTS' : '❌ MISSING'
    })
  }
  
  // Print results
  console.log('Migration Status:')
  console.log('─'.repeat(80))
  results.forEach(r => {
    console.log(`${r.status.padEnd(12)} ${r.name.padEnd(35)} ${r.file}`)
  })
  
  const applied = results.filter(r => r.exists).length
  const missing = results.filter(r => !r.exists).length
  
  console.log('─'.repeat(80))
  console.log(`\nSummary:`)
  console.log(`  Applied:  ${applied}/${results.length}`)
  console.log(`  Missing:  ${missing}/${results.length}`)
  
  if (missing > 0) {
    console.log(`\n⚠️  Missing migrations:`)
    results.filter(r => !r.exists).forEach(r => {
      console.log(`  - ${r.file}`)
    })
  } else {
    console.log(`\n✅ All migrations applied!`)
  }
}

checkMigrations().catch(console.error)


