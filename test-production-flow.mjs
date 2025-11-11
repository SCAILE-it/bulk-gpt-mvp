#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const VERCEL_URL = 'https://bulk-gpt-9l03uswsc-federicodepontes-projects.vercel.app';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testing FULL Production Flow\n');

// Step 1: Create batch via production API
console.log('Step 1: Creating batch via production API...');
const createResponse = await fetch(`${VERCEL_URL}/api/process`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    csvFilename: 'production-test.csv',
    rows: [
      { company: 'Microsoft' },
      { company: 'Amazon' }
    ],
    prompt: 'Describe {{company}} in one sentence',
    context: 'Focus on core business',
    outputColumns: [{ name: 'description' }]
  })
});

const createResult = await createResponse.json();
console.log(`  Status: ${createResponse.status}`);
console.log(`  Response:`, createResult);

if (!createResult.batchId) {
  console.log('\n❌ FAILED: No batch ID returned');
  process.exit(1);
}

const batchId = createResult.batchId;
console.log(`\n✅ Batch created: ${batchId}`);

// Step 2: Wait for Modal polling
console.log('\nStep 2: Waiting for Modal to poll and process (20 seconds)...');
await new Promise(resolve => setTimeout(resolve, 20000));

// Step 3: Check batch status via API
console.log('\nStep 3: Checking batch status via API...');
const statusResponse = await fetch(`${VERCEL_URL}/api/batch/${batchId}/status`, {
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  }
});

const statusResult = await statusResponse.json();
console.log(`  Status: ${statusResult.status}`);
console.log(`  Progress: ${statusResult.processedRows}/${statusResult.totalRows}`);

// Step 4: Get results
console.log('\nStep 4: Fetching results...');
const resultsResponse = await fetch(`${VERCEL_URL}/api/batch/${batchId}/results`, {
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  }
});

const resultsData = await resultsResponse.json();
console.log(`  Results count: ${resultsData.results?.length || 0}`);

if (resultsData.results && resultsData.results.length > 0) {
  console.log('\n✅ SUCCESS: Full production flow works!');
  resultsData.results.forEach((r, i) => {
    console.log(`\n  Row ${i + 1}:`);
    console.log(`    Status: ${r.status}`);
    if (r.status === 'success') {
      console.log(`    Output: ${r.output_data?.substring(0, 80)}...`);
    } else {
      console.log(`    Error: ${r.error_message}`);
    }
  });
} else {
  console.log('\n⚠️  No results yet - may still be processing');
}

console.log('\n✅ Production flow test complete!');
