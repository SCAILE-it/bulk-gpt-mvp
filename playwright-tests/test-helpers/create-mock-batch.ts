/**
 * Test Helper: Create Mock Batch
 *
 * Inserts a mock batch directly into the database for testing webhook handlers
 * without requiring actual Modal processing.
 *
 * This allows us to test the webhook endpoint in isolation.
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local if not already loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    // Try to load dotenv if available
    const dotenv = require('dotenv')
    const path = require('path')
    dotenv.config({ path: path.join(__dirname, '../../.env.local') })
  } catch (err) {
    // dotenv not available, continue
  }
}

// Create Supabase admin client for tests
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Gets the test user ID
 *
 * Priority:
 * 1. TEST_USER_ID environment variable
 * 2. Fetch from Supabase (if configured)
 * 3. Use placeholder test UUID
 *
 * @returns The test user's UUID
 */
export async function getTestUserId(): Promise<string> {
  // Option 1: Use environment variable if set
  if (process.env.TEST_USER_ID) {
    return process.env.TEST_USER_ID
  }

  // Option 2: Try to fetch from Supabase if properly configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers()

      if (!error && data?.users) {
        const testUser = data.users
          .filter(user => user.email?.includes('@bulkgpt.local'))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

        if (testUser) {
          return testUser.id
        }
      }
    } catch (err) {
      // Fall through to Option 3
      console.warn('Could not fetch test user from Supabase:', err)
    }
  }

  // Option 3: Use a consistent placeholder UUID for tests
  // This ensures tests can run even without Supabase configured
  return '00000000-0000-0000-0000-000000000001'
}

export interface CreateMockBatchOptions {
  userId: string
  totalRows?: number
  csvFilename?: string
  prompt?: string
  status?: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled'
}

/**
 * Creates a mock batch in the database
 *
 * @param options - Batch configuration options
 * @returns The generated batch ID
 */
export async function createMockBatch(options: CreateMockBatchOptions): Promise<string> {
  const {
    userId,
    totalRows = 3,
    csvFilename = 'test-webhook.csv',
    prompt = 'Test prompt for {{name}}',
    status = 'processing'
  } = options

  const batchId = `batch_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const { error } = await supabaseAdmin
      .from('batches')
      .insert({
        id: batchId,
        user_id: userId,
        csv_filename: csvFilename,
        total_rows: totalRows,
        status,
        prompt,
      })

    if (error) {
      console.error('Supabase insert error:', error)
      throw new Error(`Failed to create mock batch: ${error.message}`)
    }

    console.log(`✅ Mock batch created in DB: ${batchId}`)
    return batchId
  } catch (err) {
    console.error('Failed to create mock batch:', err)
    throw err
  }
}
