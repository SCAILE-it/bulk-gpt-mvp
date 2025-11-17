#!/usr/bin/env node
/**
 * Check if GTM and context variable columns exist
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

const gtmColumns = [
  'gtm_playbook',
  'product_type',
  'gtm_playbook_ai_suggested',
  'product_type_ai_suggested',
  'gtm_playbook_confidence',
  'product_type_confidence',
  'gtm_playbook_manually_overridden',
  'product_type_manually_overridden',
  'gtm_playbook_ai_suggestion',
  'product_type_ai_suggestion',
  'migration_banner_shown'
]

const contextVarColumns = [
  'tone',
  'target_countries',
  'product_description',
  'competitors',
  'target_industries',
  'compliance_flags'
]

async function checkColumns() {
  console.log('🔍 Checking GTM and Context Variable columns...\n')

  let gtmFound = 0
  let contextVarFound = 0
  const gtmMissing = []
  const contextVarMissing = []

  // Check GTM columns
  console.log('Checking GTM columns:')
  for (const col of gtmColumns) {
    try {
      const { error } = await supabase
        .from('business_contexts')
        .select(col)
        .limit(0)
      
      if (error && error.code === '42703') {
        // Column doesn't exist
        gtmMissing.push(col)
        console.log(`  ❌ ${col}`)
      } else {
        gtmFound++
        console.log(`  ✅ ${col}`)
      }
    } catch (e) {
      gtmMissing.push(col)
      console.log(`  ❌ ${col} (error: ${e.message})`)
    }
  }

  console.log('\nChecking Context Variable columns:')
  for (const col of contextVarColumns) {
    try {
      const { error } = await supabase
        .from('business_contexts')
        .select(col)
        .limit(0)
      
      if (error && error.code === '42703') {
        // Column doesn't exist
        contextVarMissing.push(col)
        console.log(`  ❌ ${col}`)
      } else {
        contextVarFound++
        console.log(`  ✅ ${col}`)
      }
    } catch (e) {
      contextVarMissing.push(col)
      console.log(`  ❌ ${col} (error: ${e.message})`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary:')
  console.log(`  GTM columns: ${gtmFound}/11`)
  console.log(`  Context Variable columns: ${contextVarFound}/6`)
  console.log('='.repeat(60) + '\n')

  if (gtmFound === 11 && contextVarFound === 6) {
    console.log('✅ All migrations already applied!')
    console.log('   No action needed.\n')
    return false
  } else {
    console.log('❌ Migrations needed:\n')
    if (gtmFound < 11) {
      console.log(`   Missing ${11 - gtmFound} GTM columns:`)
      gtmMissing.forEach(col => console.log(`     - ${col}`))
      console.log('\n   → Run: 20250116000000_add_gtm_fields_to_business_contexts.sql')
      console.log('   → Run: 20250116000001_migrate_existing_users_gtm.sql\n')
    }
    if (contextVarFound < 6) {
      console.log(`   Missing ${6 - contextVarFound} Context Variable columns:`)
      contextVarMissing.forEach(col => console.log(`     - ${col}`))
      console.log('\n   → Run: 20250116000002_add_context_variables_to_business_contexts.sql\n')
    }
    return true
  }
}

checkColumns().catch(console.error)


