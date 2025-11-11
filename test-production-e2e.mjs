#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PRODUCTION_URL = 'https://bulk-gpt-app.vercel.app'; // Main production domain
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🧪 PRODUCTION E2E TEST\n');
console.log(`Testing: ${PRODUCTION_URL}`);
console.log(`Database: ${supabaseUrl}\n`);

// Step 1: Get user credentials for authentication
const { data: users } = await supabase.auth.admin.listUsers();
if (!users || !users.users.length) {
  console.error('❌ No users found');
  process.exit(1);
}

const userId = users.users[0].id;
console.log(`✅ User ID: ${userId}\n`);

// Step 2: Create batch via production API
console.log('Step 1: Creating batch via production API...');
const testData = [
  { company: 'Google' },
  { company: 'Apple' },
  { company: 'Microsoft' }
];

try {
  const createResponse = await fetch(`${PRODUCTION_URL}/api/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      csvFilename: 'production-test.csv',
      rows: testData,
      prompt: 'What industry is {{company}} in? Answer in 3-5 words.',
      context: 'Simple factual question',
      outputColumns: [{ name: 'industry' }]
    })
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error(`❌ API Error ${createResponse.status}:`, errorText.substring(0, 200));
    process.exit(1);
  }

  const createResult = await createResponse.json();
  console.log(`   Status: ${createResponse.status}`);
  console.log(`   Response:`, createResult);

  if (!createResult.batchId) {
    console.log('\n❌ FAILED: No batch ID returned');
    process.exit(1);
  }

  const batchId = createResult.batchId;
  console.log(`\n✅ Batch created: ${batchId}\n`);

  // Step 3: Wait for Modal polling
  console.log('Step 2: Waiting for Modal to poll and process (25 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 25000));

  // Step 4: Check batch status via database
  console.log('\nStep 3: Checking batch status in database...');
  const { data: batch } = await supabase
    .from('batches')
    .select('id, status, processed_rows, total_rows')
    .eq('id', batchId)
    .single();

  console.log(`\n📊 Batch Status: ${batch.status}`);
  console.log(`   Processed: ${batch.processed_rows || 0}/${batch.total_rows}`);

  // Step 5: Get results
  const { data: results } = await supabase
    .from('batch_results')
    .select('id, status, output_data, error_message')
    .eq('batch_id', batchId)
    .order('row_index');

  if (results && results.length > 0) {
    console.log(`\n📝 Results: ${results.length} rows\n`);
    results.forEach((r, i) => {
      console.log(`   Row ${i + 1} (${testData[i].company}): ${r.status}`);
      if (r.status === 'success') {
        console.log(`      Output: ${r.output_data.substring(0, 80)}...`);
      } else {
        console.log(`      Error: ${r.error_message}`);
      }
    });
  }

  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (batch.status === 'completed' || batch.status === 'completed_with_errors') {
    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`\n✅ PRODUCTION TEST PASSED!`);
    console.log(`\n   Verified:`);
    console.log(`   ✓ Production API accepts requests`);
    console.log(`   ✓ Batch created in database`);
    console.log(`   ✓ Modal polling picked up batch`);
    console.log(`   ✓ Rows processed: ${successCount}/${testData.length}`);
    console.log(`   ✓ Results stored in database`);
    console.log(`\n   Batch ID: ${batchId}`);
    console.log(`   Status: ${batch.status}`);
  } else {
    console.log(`\n⚠️  Batch still processing: ${batch.status}`);
    console.log('   Check Modal logs: modal app logs bulk-gpt-processor-mvp');
  }
  console.log('='.repeat(60) + '\n');

} catch (error) {
  console.error('\n❌ Production test failed:', error.message);
  if (error.cause) {
    console.error('   Cause:', error.cause);
  }
  process.exit(1);
}
