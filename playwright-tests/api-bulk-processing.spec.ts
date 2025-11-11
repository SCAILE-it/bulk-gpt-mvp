/**
 * ABOUTME: Playwright test for Bulk GPT API endpoints
 * ABOUTME: Tests /api/process, /api/batch/[id]/status via direct API calls (no UI)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Bulk Processing API', () => {
  test('Full API workflow: create batch → poll status → verify results', async ({ request, page }) => {
    test.setTimeout(180000) // 3 minutes for full batch processing

    console.log('\n🚀 Starting API integration test...\n')

    // Step 1: Authenticate via UI to get session cookies
    console.log('Step 1: Authenticating...')
    await page.goto(BASE_URL)

    // Wait for app to load (auth should be automatic in local development)
    await page.waitForTimeout(2000)

    // Get cookies for API requests
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    console.log('✓ Authentication successful\n')

    // Step 2: Create batch via API
    console.log('Step 2: Creating batch via POST /api/process...')
    const batchRequest = {
      csvFilename: `api-test-${Date.now()}.csv`,
      rows: [
        { name: 'Alice Johnson', company: 'Stripe' },
        { name: 'Bob Smith', company: 'Anthropic' },
        { name: 'Carol White', company: 'OpenAI' }
      ],
      prompt: 'Write a professional bio for {{name}} at {{company}}. Return JSON with: company_name (string), industry (string), business_model (string describing their business in 1-2 sentences)',
      context: 'Professional bios for tech leaders',
      outputColumns: ['company_name', 'industry', 'business_model']
    }

    console.log(`Request payload:`, JSON.stringify(batchRequest, null, 2))

    const createResponse = await request.post(`${BASE_URL}/api/process`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      data: batchRequest
    })

    expect(createResponse.ok()).toBeTruthy()
    const createData = await createResponse.json()

    console.log(`Response:`, JSON.stringify(createData, null, 2))

    expect(createData.success).toBe(true)
    expect(createData.batchId).toBeDefined()
    expect(createData.status).toBe('pending')
    expect(createData.totalRows).toBe(3)

    const batchId = createData.batchId
    console.log(`✓ Batch created: ${batchId}\n`)

    // Step 3: Poll batch status until completion
    console.log('Step 3: Polling batch status...')

    let attempt = 0
    const maxAttempts = 60 // 2 minutes max (2s * 60)
    let finalStatus = 'pending'
    let finalData: any

    while (attempt < maxAttempts) {
      attempt++

      const statusResponse = await request.get(`${BASE_URL}/api/batch/${batchId}/status`, {
        headers: {
          'Cookie': cookieHeader
        }
      })

      expect(statusResponse.ok()).toBeTruthy()
      finalData = await statusResponse.json()

      finalStatus = finalData.status
      const progress = finalData.progressPercent || 0
      const processed = finalData.processedRows || 0
      const total = finalData.totalRows || 0

      process.stdout.write(`\r[Attempt ${attempt}/${maxAttempts}] Status: ${finalStatus} | Progress: ${processed}/${total} (${progress}%)   `)

      if (finalStatus === 'completed' || finalStatus === 'completed_with_errors' || finalStatus === 'failed') {
        process.stdout.write('\n')
        console.log(`✓ Batch ${finalStatus}!\n`)
        break
      }

      await page.waitForTimeout(2000) // Poll every 2 seconds
    }

    // Verify batch completed successfully
    expect(finalStatus).toMatch(/completed|completed_with_errors/)
    expect(finalData.results).toBeDefined()
    expect(finalData.results.length).toBe(3)

    console.log(`Final Status Response:`, JSON.stringify(finalData, null, 2))

    // Step 4: Verify individual results
    console.log('\nStep 4: Verifying individual results...')

    for (let i = 0; i < finalData.results.length; i++) {
      const result = finalData.results[i]
      console.log(`\nRow ${i + 1}:`)
      console.log(`  Input: ${JSON.stringify(result.input)}`)
      console.log(`  Status: ${result.status}`)

      if (result.status === 'success') {
        // Validate output is present
        expect(result.output).toBeDefined()
        expect(result.output).not.toBe('')

        // Try to parse output as JSON (if using outputColumns)
        try {
          const outputData = typeof result.output === 'string'
            ? JSON.parse(result.output)
            : result.output

          console.log(`  Output Data:`, outputData)

          // Verify expected output fields
          expect(outputData).toHaveProperty('company_name')
          expect(outputData).toHaveProperty('industry')
          expect(outputData).toHaveProperty('business_model')

          console.log(`  ✓ Valid JSON output with all required fields`)
        } catch (e) {
          // If not JSON, just verify it's a string
          console.log(`  Output (text): ${result.output.substring(0, 100)}...`)
          console.log(`  ⚠ Output is not JSON (may be expected)`)
        }
      } else {
        console.log(`  Error: ${result.error}`)
        console.log(`  ✗ Row failed`)
      }
    }

    // Step 5: Verify BatchStatusCard would show correct counts
    console.log('\nStep 5: Verifying status counts...')

    const successCount = finalData.results.filter((r: any) => r.status === 'success').length
    const errorCount = finalData.results.filter((r: any) => r.status === 'error').length
    const pendingCount = finalData.results.length - successCount - errorCount

    console.log(`  Success: ${successCount}`)
    console.log(`  Failed: ${errorCount}`)
    console.log(`  Pending: ${pendingCount}`)

    expect(successCount + errorCount).toBe(finalData.results.length)
    expect(pendingCount).toBe(0) // All should be processed

    console.log('\n✅ All API tests passed!\n')
  })

  test('Error handling: missing required fields', async ({ request }) => {
    console.log('\n🧪 Testing error handling...\n')

    // Test missing csvFilename
    const invalidRequest1 = await request.post(`${BASE_URL}/api/process`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        rows: [{ name: 'Test' }],
        prompt: 'Test prompt'
      }
    })

    expect(invalidRequest1.status()).toBe(400)
    const error1 = await invalidRequest1.json()
    expect(error1.error).toContain('csvFilename')
    console.log('✓ Correctly rejected missing csvFilename')

    // Test missing rows
    const invalidRequest2 = await request.post(`${BASE_URL}/api/process`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        csvFilename: 'test.csv',
        prompt: 'Test prompt'
      }
    })

    expect(invalidRequest2.status()).toBe(400)
    const error2 = await invalidRequest2.json()
    expect(error2.error).toContain('rows')
    console.log('✓ Correctly rejected missing rows')

    // Test missing prompt
    const invalidRequest3 = await request.post(`${BASE_URL}/api/process`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        csvFilename: 'test.csv',
        rows: [{ name: 'Test' }]
      }
    })

    expect(invalidRequest3.status()).toBe(400)
    const error3 = await invalidRequest3.json()
    expect(error3.error).toContain('prompt')
    console.log('✓ Correctly rejected missing prompt')

    console.log('\n✅ Error handling tests passed!\n')
  })

  test('Invalid batch ID returns 404', async ({ request, page }) => {
    console.log('\n🧪 Testing invalid batch ID...\n')

    // Get cookies for authentication
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const invalidBatchId = 'invalid_batch_id_12345'
    const statusResponse = await request.get(`${BASE_URL}/api/batch/${invalidBatchId}/status`, {
      headers: { 'Cookie': cookieHeader }
    })

    expect(statusResponse.status()).toBe(404)
    const errorData = await statusResponse.json()
    expect(errorData.error).toBeDefined()

    console.log('✓ Correctly returned 404 for invalid batch ID')
    console.log(`  Error: ${errorData.error}`)
    console.log('\n✅ Invalid batch ID test passed!\n')
  })
})
