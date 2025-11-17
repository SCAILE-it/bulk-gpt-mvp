/**
 * Script to check batch_results in Supabase for test@bulkgpt.local
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('Looking for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkBatchResults() {
  try {
    // Note: We can't use admin API without service role key
    // Instead, we'll query batches directly and check batch_results
    console.log('Querying batches and batch_results...\n')
    
    // Get all completed batches (we'll filter by email pattern in filename or check all)
    // Since we can't get user_id directly, we'll check batches and see which have results
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('id, csv_filename, status, total_rows, processed_rows, created_at, updated_at, user_id')
      .in('status', ['completed', 'completed_with_errors'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (batchesError) {
      console.error('Error fetching batches:', batchesError)
      return
    }

    console.log(`Found ${batches?.length || 0} completed batches:\n`)
    
    // Check batch_results for each batch
    if (batches && batches.length > 0) {
      console.log('Checking batch_results for each batch:\n')
      
      for (const batch of batches) {
        const { data: batchResults, error: resultsError } = await supabase
          .from('batch_results')
          .select('id, status, input_data, output_data')
          .eq('batch_id', batch.id)
          .eq('status', 'completed')
          .limit(3)

        const hasResults = batchResults && batchResults.length > 0
        
        console.log(`${batch.csv_filename}`)
        console.log(`   ID: ${batch.id}`)
        console.log(`   Created: ${new Date(batch.created_at).toLocaleString()}`)
        console.log(`   Rows: ${batch.processed_rows}/${batch.total_rows}`)
        console.log(`   Batch Results: ${hasResults ? `✓ Found ${batchResults.length}` : '✗ None'}`)
        
        if (hasResults && batchResults.length > 0) {
          const firstResult = batchResults[0]
          const input = typeof firstResult.input_data === 'string' 
            ? JSON.parse(firstResult.input_data) 
            : firstResult.input_data || {}
          const output = typeof firstResult.output_data === 'string'
            ? JSON.parse(firstResult.output_data)
            : firstResult.output_data || {}
          
          console.log(`   Input keys: ${Object.keys(input).join(', ')}`)
          console.log(`   Output keys: ${Object.keys(output).join(', ')}`)
          if (input.name || input.Name) {
            console.log(`   Sample name: ${input.name || input.Name}`)
          }
        }
        console.log('')
      }

      // Find the batch that would be selected for replay
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentBatch = batches.find(b => {
        const batchDate = new Date(b.created_at)
        return batchDate >= sevenDaysAgo && (b.status === 'completed' || b.status === 'completed_with_errors')
      }) || batches[0]

      console.log(`\n📌 Batch that would be selected for replay:`)
      console.log(`   ${recentBatch.csv_filename}`)
      console.log(`   ID: ${recentBatch.id}`)
      console.log(`   Created: ${new Date(recentBatch.created_at).toLocaleString()}`)
      
      const { data: replayResults } = await supabase
        .from('batch_results')
        .select('id, status')
        .eq('batch_id', recentBatch.id)
        .eq('status', 'completed')
        .limit(1)

      if (replayResults && replayResults.length > 0) {
        console.log(`   ✓ Has batch_results - WILL SHOW REAL DATA`)
      } else {
        console.log(`   ✗ No batch_results - WILL SHOW DEMO DATA`)
      }
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

checkBatchResults()

