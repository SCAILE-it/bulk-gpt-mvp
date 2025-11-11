#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPollingFlow() {
  console.log('🧪 Testing Database Polling Flow\n');

  // Step 1: Clean up old test batches
  console.log('Step 1: Cleaning up old batches with NULL data...');
  const { error: cleanupError } = await supabase
    .from('batches')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .in('status', ['pending', 'processing'])
    .is('data', null);

  if (cleanupError) {
    console.error('❌ Cleanup failed:', cleanupError);
  } else {
    console.log('✅ Old batches cleaned up\n');
  }

  // Step 2: Get a valid user ID
  console.log('Step 2: Getting user ID...');
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError || !users.users.length) {
    console.error('❌ Failed to get user:', userError);
    process.exit(1);
  }

  const userId = users.users[0].id;
  console.log(`✅ Using user: ${userId}\n`);

  // Step 3: Create test batch with valid data
  console.log('Step 3: Creating test batch...');
  const batchId = `test_polling_${Date.now()}`;
  const testData = [
    { id: '1', company: 'Google' },
    { id: '2', company: 'Apple' }
  ];

  const { data: batch, error: insertError } = await supabase
    .from('batches')
    .insert({
      id: batchId,
      user_id: userId,
      status: 'pending',
      csv_filename: 'test-polling.csv',
      total_rows: 2,
      prompt: 'Analyze {{company}} and rate innovation 1-10',
      data: testData,
      context: 'Focus on recent AI developments',
      output_schema: [{ name: 'innovation_score' }]
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Failed to create batch:', insertError);
    process.exit(1);
  }

  console.log(`✅ Created batch: ${batchId}`);
  console.log(`   Status: ${batch.status}`);
  console.log(`   Rows: ${batch.total_rows}\n`);

  // Step 4: Wait for Modal to pick it up (polls every 10 seconds)
  console.log('Step 4: Waiting for Modal polling (15 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Step 5: Check batch status
  console.log('\nStep 5: Checking batch status...');
  const { data: updatedBatch, error: checkError } = await supabase
    .from('batches')
    .select('id, status, processed_rows, total_rows')
    .eq('id', batchId)
    .single();

  if (checkError) {
    console.error('❌ Failed to check batch:', checkError);
    process.exit(1);
  }

  console.log(`\n📊 Batch Status: ${updatedBatch.status}`);
  console.log(`   Processed: ${updatedBatch.processed_rows || 0}/${updatedBatch.total_rows}`);

  if (updatedBatch.status === 'processing') {
    console.log('\n✅ SUCCESS: Modal picked up the batch!');
    console.log('   The polling flow is working correctly.');
    console.log('\n⏳ Batch is now processing. Check Modal logs for progress:');
    console.log('   modal app logs bulk-gpt-processor-mvp');
  } else if (updatedBatch.status === 'completed') {
    console.log('\n✅ SUCCESS: Batch completed!');
  } else {
    console.log(`\n⚠️  Batch still in status: ${updatedBatch.status}`);
    console.log('   Modal may not have picked it up yet. Wait longer or check logs.');
  }

  // Step 6: Check batch_results
  const { data: results, error: resultsError } = await supabase
    .from('batch_results')
    .select('id, status, output_data, error_message')
    .eq('batch_id', batchId);

  if (results && results.length > 0) {
    console.log(`\n📝 Results found: ${results.length}`);
    results.forEach((r, i) => {
      console.log(`   Row ${i + 1}: ${r.status}`);
      if (r.status === 'success') {
        console.log(`      Output: ${r.output_data?.substring(0, 100)}...`);
      } else {
        console.log(`      Error: ${r.error_message}`);
      }
    });
  }

  console.log('\n✅ Test complete!');
}

testPollingFlow().catch(console.error);
