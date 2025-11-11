#!/usr/bin/env node

/**
 * Check the most recent batch status from Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkBatchStatus() {
  console.log('🔍 Fetching most recent batches...\n')

  // Get the 5 most recent batches
  const { data: batches, error } = await supabase
    .from('batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Error fetching batches:', error)
    process.exit(1)
  }

  if (!batches || batches.length === 0) {
    console.log('ℹ️  No batches found')
    process.exit(0)
  }

  console.log(`📊 Found ${batches.length} recent batches:\n`)

  for (const batch of batches) {
    console.log('─'.repeat(80))
    console.log(`📦 Batch ID: ${batch.id}`)
    console.log(`👤 User ID: ${batch.user_id}`)
    console.log(`📝 Status: ${batch.status}`)
    console.log(`📊 Progress: ${batch.processed_rows}/${batch.total_rows} (${batch.progress_percentage}%)`)
    console.log(`❌ Failed: ${batch.failed_rows}`)
    console.log(`📄 CSV: ${batch.csv_filename}`)
    console.log(`📅 Created: ${batch.created_at}`)
    console.log(`⏰ Started: ${batch.started_at || 'Not started'}`)
    console.log(`✅ Completed: ${batch.completed_at || 'Not completed'}`)
    console.log(`📝 Prompt: ${batch.prompt.substring(0, 100)}${batch.prompt.length > 100 ? '...' : ''}`)

    // Check batch_results for this batch
    const { data: results, error: resultsError } = await supabase
      .from('batch_results')
      .select('status')
      .eq('batch_id', batch.id)

    if (!resultsError && results) {
      const successCount = results.filter(r => r.status === 'success').length
      const errorCount = results.filter(r => r.status === 'error').length
      const pendingCount = results.filter(r => r.status === 'pending').length

      console.log(`📊 Results: ${results.length} total (✅ ${successCount} success, ❌ ${errorCount} error, ⏳ ${pendingCount} pending)`)
    }

    console.log()
  }

  console.log('─'.repeat(80))
  console.log('\n✅ Done')
}

// Run
checkBatchStatus().catch(err => {
  console.error('💥 Unexpected error:', err)
  process.exit(1)
})
