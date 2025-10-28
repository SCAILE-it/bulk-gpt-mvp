import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const batchId = 'batch_1761592044108_krmnngs8q';

async function checkBatch() {
  // Check batches table
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('id, status, total_rows, processed_rows, created_at')
    .eq('id', batchId)
    .single();

  if (batchError) {
    console.log('❌ Batch not found in batches table:', batchError.message);
  } else {
    console.log('✅ Batch found in database:');
    console.log('  ID:', batch.id);
    console.log('  Status:', batch.status);
    console.log('  Total rows:', batch.total_rows);
    console.log('  Processed rows:', batch.processed_rows);
    console.log('  Created:', new Date(batch.created_at).toISOString());
    console.log('');
  }

  // Check batch_results table
  const { data: results, error: resultsError } = await supabase
    .from('batch_results')
    .select('status, output_data, input_tokens, output_tokens, model')
    .eq('batch_id', batchId);

  if (resultsError) {
    console.log('❌ Error fetching results:', resultsError.message);
  } else if (!results || results.length === 0) {
    console.log('⏳ No results yet - batch still processing');
  } else {
    console.log('✅ Batch results:');
    console.log('  Results count:', results.length);
    console.log('  Row 1 status:', results[0]?.status);

    const outputData = results[0]?.output_data;
    if (outputData && typeof outputData === 'object') {
      console.log('  Output fields:', Object.keys(outputData));
      console.log('  bio:', outputData.bio?.substring(0, 50) + '...');
      console.log('  skills:', outputData.skills?.substring(0, 50) + '...');
      console.log('  experience:', outputData.experience?.substring(0, 50) + '...');
    }

    console.log('  Tokens: ↑', results[0]?.input_tokens || 0, '/ ↓', results[0]?.output_tokens || 0);
    console.log('  Model:', results[0]?.model || 'N/A');
  }
}

checkBatch();
