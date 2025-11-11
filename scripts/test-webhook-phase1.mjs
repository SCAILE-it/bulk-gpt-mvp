#!/usr/bin/env node

/**
 * Phase 1: Test webhook endpoint with mock Modal V2 response
 *
 * This script:
 * 1. Creates a test batch in Supabase
 * 2. Calls the webhook endpoint with mock data
 * 3. Verifies the results in the database
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://bulk-gpt-app.vercel.app/api/webhook/modal-callback'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗')
  process.exit(1)
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test batch configuration
const TEST_BATCH_ID = `test_webhook_${Date.now()}`

console.log('\n🧪 Phase 1: Webhook Endpoint Testing')
console.log('=' .repeat(60))
console.log(`Batch ID: ${TEST_BATCH_ID}`)
console.log(`Webhook URL: ${WEBHOOK_URL}`)
console.log('')

async function main() {
  try {
    // Step 0: Get or create a valid user ID in public.users table
    console.log('🔍 Step 0: Getting valid user ID...')

    // First, try to get existing user from public.users
    let { data: existingUsers } = await supabase.from('users').select('id').limit(1)

    let TEST_USER_ID
    if (existingUsers && existingUsers.length > 0) {
      TEST_USER_ID = existingUsers[0].id
      console.log(`✅ Using existing user ID from public.users: ${TEST_USER_ID}`)
    } else {
      // No users in public.users, create one from auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1 })

      if (authError || !authUsers?.users?.length) {
        console.error('❌ No users found in auth.users either')
        throw new Error('Need at least one user in database for testing')
      }

      const authUserId = authUsers.users[0].id
      const authUserEmail = authUsers.users[0].email

      // Create user in public.users table
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          email: authUserEmail,
        })
        .select()
        .single()

      if (createUserError) {
        console.error('❌ Failed to create user in public.users:', createUserError.message)
        throw createUserError
      }

      TEST_USER_ID = newUser.id
      console.log(`✅ Created new user in public.users: ${TEST_USER_ID}`)
    }
    console.log('')

    // Step 1: Create test batch in Supabase
    console.log('📝 Step 1: Creating test batch in Supabase...')
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert({
        id: TEST_BATCH_ID,
        user_id: TEST_USER_ID,
        csv_filename: 'test-webhook.csv',
        total_rows: 2,
        status: 'pending',
        prompt: 'Test prompt for {{name}}',
      })
      .select()
      .single()

    if (batchError) {
      console.error('❌ Failed to create batch:', batchError.message)
      throw batchError
    }

    console.log('✅ Batch created successfully')
    console.log('')

    // Step 2: Call webhook with mock Modal V2 response
    console.log('📞 Step 2: Calling webhook with mock Modal V2 response...')

    const mockModalResponse = {
      batch_id: TEST_BATCH_ID,
      status: 'completed',
      total_rows: 2,
      successful: 2,
      failed: 0,
      results: [
        {
          status: 'success',
          row_index: 0,
          data: {
            prompt_executor: {
              data: {
                output: 'This is test output for row 1',
                prompt: 'Test prompt for Alice',
                rendered_prompt: 'Test prompt for Alice'
              }
            }
          }
        },
        {
          status: 'success',
          row_index: 1,
          data: {
            prompt_executor: {
              data: {
                output: 'This is test output for row 2',
                prompt: 'Test prompt for Bob',
                rendered_prompt: 'Test prompt for Bob'
              }
            }
          }
        }
      ]
    }

    console.log('Payload:', JSON.stringify(mockModalResponse, null, 2))
    console.log('')

    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockModalResponse)
    })

    console.log(`Response status: ${webhookResponse.status}`)
    console.log(`Response headers:`, Object.fromEntries(webhookResponse.headers.entries()))

    const responseText = await webhookResponse.text()
    console.log(`Response body (first 500 chars): ${responseText.substring(0, 500)}`)

    let webhookData
    try {
      webhookData = JSON.parse(responseText)
      console.log('Response data:', JSON.stringify(webhookData, null, 2))
    } catch (e) {
      console.warn('⚠️  Response is not JSON (possibly HTML 404 page)')
    }
    console.log('')

    if (!webhookResponse.ok) {
      console.error('❌ Webhook call failed')
      throw new Error(`Webhook returned ${webhookResponse.status}: ${responseText.substring(0, 200)}`)
    }

    console.log('✅ Webhook called successfully')
    console.log('')

    // Step 3: Verify results in database
    console.log('🔍 Step 3: Verifying results in database...')

    // Wait a moment for database to update
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check batch status
    const { data: updatedBatch, error: batchCheckError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', TEST_BATCH_ID)
      .single()

    if (batchCheckError) {
      console.error('❌ Failed to fetch batch:', batchCheckError.message)
      throw batchCheckError
    }

    console.log('Batch status:', updatedBatch.status)
    console.log('Processed rows:', updatedBatch.processed_rows || 0)
    console.log('')

    // Check batch results
    const { data: results, error: resultsError } = await supabase
      .from('batch_results')
      .select('*')
      .eq('batch_id', TEST_BATCH_ID)
      .order('row_index', { ascending: true })

    if (resultsError) {
      console.error('❌ Failed to fetch results:', resultsError.message)
      throw resultsError
    }

    console.log(`Found ${results.length} batch_results rows`)
    results.forEach((result, idx) => {
      console.log(`  Row ${idx}:`)
      console.log(`    - row_index: ${result.row_index}`)
      console.log(`    - status: ${result.status}`)
      console.log(`    - output_data: ${result.output_data?.substring(0, 50)}...`)
      console.log(`    - error_message: ${result.error_message || 'null'}`)
    })
    console.log('')

    // Verify success criteria
    console.log('✅ Verification Results:')
    const checks = [
      { name: 'Batch status is "completed"', pass: updatedBatch.status === 'completed' },
      { name: 'Processed rows = 2', pass: updatedBatch.processed_rows === 2 },
      { name: 'batch_results has 2 rows', pass: results.length === 2 },
      { name: 'Row 0 has output', pass: results[0]?.output_data?.includes('test output for row 1') },
      { name: 'Row 1 has output', pass: results[1]?.output_data?.includes('test output for row 2') },
      { name: 'All results successful', pass: results.every(r => r.status === 'success') },
    ]

    checks.forEach(check => {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`)
    })
    console.log('')

    const allPassed = checks.every(c => c.pass)

    if (allPassed) {
      console.log('🎉 Phase 1: PASSED - Webhook endpoint works correctly!')
      console.log('✅ Ready to proceed to Phase 2 (Modal direct testing)')
    } else {
      console.log('⚠️  Phase 1: PARTIAL - Some checks failed, review above')
    }

    console.log('')
    console.log('🧹 Cleanup: Test batch and results left in database for inspection')
    console.log(`   Batch ID: ${TEST_BATCH_ID}`)
    console.log('')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
