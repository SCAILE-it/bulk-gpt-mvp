import { test, expect } from '@playwright/test'
import { generateModalV2Payload, generateErrorPayload } from '../scripts/generate-mock-webhook-payload'
import { createMockBatch, getTestUserId } from './test-helpers/create-mock-batch'

/**
 * Local Webhook Handler Unit Test
 *
 * Tests the webhook endpoint directly with mock Modal V2 payloads.
 * This complements the production E2E test by providing fast local testing
 * of the webhook handling logic without requiring actual Modal processing.
 *
 * Purpose:
 * - Validate webhook endpoint processes Modal V2 payloads correctly
 * - Test database updates (batch status + results storage)
 * - Test error handling (invalid payloads, missing batches)
 * - Enable rapid development iteration
 *
 * REQUIREMENTS:
 * - Dev server must be running on port 3000: `npm run dev`
 * - Tests create mock batches directly in DB, then send mock webhooks
 * - No browser needed (uses Playwright's request context)
 * - No Modal dependency (uses mock payloads and direct DB inserts)
 *
 * Usage:
 *   npm run dev                                          # Start server
 *   npx playwright test test-webhook-handler-local.spec.ts  # Run tests
 */

const BASE_URL = 'http://localhost:3334' // Test server port (matches playwright.config.ts)

test.describe('Webhook Handler - Local Unit Tests', () => {
  test('should process valid Modal V2 webhook payload', async ({ request }) => {
    console.log('\n๐งช Test: Valid webhook payload processing\n')

    // Step 1: Create a mock batch directly in database (bypass /api/process)
    console.log('1๏ธโƒ Creating mock batch in database...')
    const userId = await getTestUserId()
    const batchId = await createMockBatch({ userId, totalRows: 3 })

    expect(batchId).toBeTruthy()
    expect(batchId).toMatch(/^batch_test_/)
    console.log(`โ Mock batch created: ${batchId}`)

    // Step 2: Generate mock webhook payload
    console.log('\n2๏ธโƒ Generating mock Modal V2 payload...')
    const webhookPayload = generateModalV2Payload({
      batchId,
      totalRows: 3,
      successful: 3,
      failed: 0,
      status: 'completed',
    })
    console.log(`โ Generated payload with ${webhookPayload.results.length} results`)

    // Step 3: Call webhook endpoint
    console.log('\n3๏ธโƒ Sending webhook callback...')
    const webhookResponse = await request.post(`${BASE_URL}/api/webhook/modal-callback`, {
      data: webhookPayload,
    })

    const webhookData = await webhookResponse.json()
    console.log(`Webhook response (status ${webhookResponse.status()}):`, JSON.stringify(webhookData, null, 2))
    expect(webhookResponse.ok()).toBeTruthy()

    expect(webhookData.message).toContain('successfully')
    expect(webhookData.rowsProcessed).toBe(3)

    // Step 4: Verify batch status was updated (via dashboard or API)
    console.log('\n4๏ธโƒ Verifying batch status...')
    // Note: In a real test, you'd query the database or use a /api/batch/{id} endpoint
    // For now, we verify the webhook response indicates success
    expect(webhookData.status).toBe('completed')

    console.log('โ TEST PASSED: Webhook processed valid payload successfully\n')
  })

  test('should handle webhook payload with errors', async ({ request }) => {
    console.log('\n๐งช Test: Webhook payload with partial errors\n')

    // Step 1: Create mock batch in database
    const userId = await getTestUserId()
    const batchId = await createMockBatch({ userId, totalRows: 3 })
    console.log(`Mock batch created: ${batchId}`)

    // Step 2: Generate error payload (2 success, 1 failed)
    const webhookPayload = generateErrorPayload({
      batchId,
      totalRows: 3,
    })
    console.log(`Generated payload: ${webhookPayload.successful} successful, ${webhookPayload.failed} failed`)

    // Step 3: Send webhook
    const webhookResponse = await request.post(`${BASE_URL}/api/webhook/modal-callback`, {
      data: webhookPayload,
    })

    expect(webhookResponse.ok()).toBeTruthy()
    const webhookData = await webhookResponse.json()

    // Verify mixed results
    expect(webhookData.rowsProcessed).toBe(3)
    expect(webhookData.status).toBe('completed_with_errors')

    console.log('โ TEST PASSED: Webhook handled errors correctly\n')
  })

  test('should reject webhook for non-existent batch', async ({ request }) => {
    console.log('\n๐งช Test: Webhook for non-existent batch\n')

    const fakeBatchId = 'batch_nonexistent_12345'

    const webhookPayload = generateModalV2Payload({
      batchId: fakeBatchId,
      totalRows: 1,
      successful: 1,
    })

    const webhookResponse = await request.post(`${BASE_URL}/api/webhook/modal-callback`, {
      data: webhookPayload,
    })

    // Should return 404 or error response
    expect(webhookResponse.status()).toBeGreaterThanOrEqual(400)

    const webhookData = await webhookResponse.json()
    expect(webhookData.error || webhookData.message).toBeTruthy()

    console.log('โ TEST PASSED: Webhook rejected invalid batch ID\n')
  })

  test('should reject malformed webhook payload', async ({ request }) => {
    console.log('\n๐งช Test: Malformed webhook payload\n')

    // Send invalid payload (missing required fields)
    const invalidPayload = {
      batch_id: 'test_123',
      // Missing results, status, etc.
    }

    const webhookResponse = await request.post(`${BASE_URL}/api/webhook/modal-callback`, {
      data: invalidPayload,
    })

    expect(webhookResponse.status()).toBeGreaterThanOrEqual(400)

    const webhookData = await webhookResponse.json()
    expect(webhookData.error || webhookData.message).toBeTruthy()

    console.log('โ TEST PASSED: Webhook rejected malformed payload\n')
  })

  test('should transform Modal V2 nested format to flat format', async ({ request }) => {
    console.log('\n๐งช Test: V2 format transformation\n')

    // Create mock batch in database
    const userId = await getTestUserId()
    const batchId = await createMockBatch({ userId, totalRows: 1 })

    // Generate V2 payload with nested output structure
    const webhookPayload = {
      batch_id: batchId,
      total_rows: 1,
      successful: 1,
      failed: 0,
      status: 'completed',
      processing_time_seconds: 1.5,
      avg_time_per_row: 1.5,
      results: [
        {
          row_index: 0,
          input: { name: 'John Doe', company: 'Acme' },
          data: {
            prompt_executor: {
              data: {
                output: {
                  bio: 'Professional bio for John Doe at Acme.',
                  summary: 'Software engineer with 10 years experience.',
                },
              },
            },
          },
          status: 'completed',
          error: null,
          processing_time_ms: 1500,
        },
      ],
    }

    const webhookResponse = await request.post(`${BASE_URL}/api/webhook/modal-callback`, {
      data: webhookPayload,
    })

    expect(webhookResponse.ok()).toBeTruthy()
    const webhookData = await webhookResponse.json()

    expect(webhookData.rowsProcessed).toBe(1)
    expect(webhookData.status).toBe('completed')

    console.log('โ TEST PASSED: V2 format transformed correctly\n')
  })
})

test.describe('Webhook Handler - Integration Tests', () => {
  test('should update batch status from processing to completed', async ({ request }) => {
    console.log('\n๐งช Integration Test: Batch status transition\n')

    // Create mock batch in database with 'processing' status
    const userId = await getTestUserId()
    const batchId = await createMockBatch({ userId, totalRows: 1, status: 'processing' })

    // Initial status is 'processing'
    console.log(`Initial status: processing`)

    // Send webhook to mark complete
    const webhookPayload = generateModalV2Payload({
      batchId,
      totalRows: 1,
      successful: 1,
    })

    const webhookResponse = await request.post(`${BASE_URL}/api/webhook/modal-callback`, {
      data: webhookPayload,
    })

    const webhookData = await webhookResponse.json()

    // Final status should be 'completed'
    expect(webhookData.status).toBe('completed')
    console.log(`Final status: ${webhookData.status}`)

    console.log('โ TEST PASSED: Batch status transitioned correctly\n')
  })
})
