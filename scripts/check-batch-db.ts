import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const batchId = 'batch_1761521240991_0grk8wz6x'

async function checkBatchStatus() {
  console.log('\n🔍 Checking batch status in database...\n')

  // Check batches table
  console.log('=== BATCHES TABLE ===')
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('*')
    .eq('id', batchId)
    .single()

  if (batchError) {
    console.error('❌ Error fetching batch:', batchError.message)
  } else if (!batch) {
    console.log('❌ Batch not found in database')
  } else {
    console.log('✅ Batch found:')
    console.log(`   ID: ${batch.id}`)
    console.log(`   Status: ${batch.status}`)
    console.log(`   Total Rows: ${batch.total_rows}`)
    console.log(`   Processed Rows: ${batch.processed_rows || 0}`)
    console.log(`   Created: ${batch.created_at}`)
    console.log(`   Updated: ${batch.updated_at}`)
  }

  // Check batch_results table
  console.log('\n=== BATCH_RESULTS TABLE ===')
  const { data: results, error: resultsError } = await supabase
    .from('batch_results')
    .select('*')
    .eq('batch_id', batchId)
    .limit(10)

  if (resultsError) {
    console.error('❌ Error fetching results:', resultsError.message)
  } else if (!results || results.length === 0) {
    console.log('❌ No results found for this batch')
  } else {
    console.log(`✅ Found ${results.length} result rows:\n`)
    results.forEach((result, i) => {
      console.log(`   Row ${i + 1}:`)
      console.log(`      Status: ${result.status}`)
      console.log(`      Input: ${JSON.stringify(result.input_data).substring(0, 50)}...`)
      console.log(`      Output: ${result.output_data || '(empty)'}`)
      console.log(`      Error: ${result.error_message || '(none)'}`)
      console.log(`      Tokens: ↑${result.input_tokens || 0} / ↓${result.output_tokens || 0}`)
      console.log(`      Model: ${result.model || '(none)'}`)
      console.log('')
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('CONCLUSION:')
  if (batch && batch.status === 'completed') {
    console.log('✅ Batch is marked as COMPLETED in database')
  } else if (batch && batch.status === 'processing') {
    console.log('⏳ Batch is still PROCESSING')
  } else if (batch && batch.status === 'pending') {
    console.log('⚠️  Batch is still PENDING (never started processing)')
  } else if (batch && batch.status === 'failed') {
    console.log('❌ Batch FAILED')
  }

  if (results && results.length > 0 && results.every(r => r.output_data)) {
    console.log('✅ All rows have output data')
  } else if (results && results.length > 0) {
    const withOutput = results.filter(r => r.output_data).length
    console.log(`⚠️  Only ${withOutput}/${results.length} rows have output`)
  }
  console.log('='.repeat(80) + '\n')
}

checkBatchStatus().catch(console.error)
