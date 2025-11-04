#!/usr/bin/env node

/**
 * Test A: Direct Node.js Modal API Test
 *
 * Purpose: Test Modal API call outside of Vercel/Next.js to isolate the issue
 *
 * This script:
 * - Uses native Node.js fetch (Node 18+)
 * - Implements same retry logic as production
 * - Sends same payload structure
 * - Logs every step with timestamps
 *
 * Run: node scripts/test-modal-direct-fetch.mjs
 */

const MODAL_URL = 'https://scaile--g-mcp-tools-v2-api.modal.run/bulk/generic'
const TIMEOUT_MS = 120000 // 2 minutes (same as production)
const MAX_RETRIES = 2

// Test payload - minimal but complete
const TEST_PAYLOAD = {
  rows: [
    { name: 'Alice Johnson', company: 'TechCorp' },
    { name: 'Bob Smith', company: 'StartupXYZ' }
  ],
  prompt: 'Write a professional bio for {{name}} who works at {{company}}',
  output_schema: [
    { name: 'bio', description: 'Professional biography' }
  ],
  context: 'Professional bios for company website',
  temperature: 0.7,
  max_tokens: 8192
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const startTime = Date.now()

  console.log(`\n[${new Date().toISOString()}] ⏱️  fetchWithTimeout START`)
  console.log(`  URL: ${url}`)
  console.log(`  Method: ${options.method || 'GET'}`)
  console.log(`  Timeout: ${timeoutMs}ms (${timeoutMs / 1000}s)`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    const elapsed = Date.now() - startTime
    console.log(`\n[${new Date().toISOString()}] ⏰ TIMEOUT TRIGGERED after ${elapsed}ms`)
    console.log(`  Aborting request...`)
    controller.abort()
  }, timeoutMs)

  try {
    console.log(`\n[${new Date().toISOString()}] 🚀 Starting fetch call...`)

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })

    const duration = Date.now() - startTime
    console.log(`\n[${new Date().toISOString()}] ✅ Fetch completed in ${duration}ms (${(duration / 1000).toFixed(2)}s)`)
    console.log(`  Status: ${response.status} ${response.statusText}`)
    console.log(`  OK: ${response.ok}`)
    console.log(`  Headers:`, Object.fromEntries(response.headers.entries()))

    return response

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`\n[${new Date().toISOString()}] ❌ Fetch failed after ${duration}ms (${(duration / 1000).toFixed(2)}s)`)
    console.error(`  Error type: ${error.constructor.name}`)
    console.error(`  Error name: ${error.name}`)
    console.error(`  Error message: ${error.message}`)

    if (error.name === 'AbortError') {
      console.error(`  🚨 REQUEST TIMED OUT - AbortController triggered`)
      const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`)
      timeoutError.name = 'TimeoutError'
      throw timeoutError
    }

    throw error

  } finally {
    clearTimeout(timeoutId)
    console.log(`\n[${new Date().toISOString()}] 🧹 fetchWithTimeout cleanup complete`)
  }
}

/**
 * Retry logic with exponential backoff
 */
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, initialDelay = 1000 } = options

  console.log(`\n[${new Date().toISOString()}] 🔄 Starting retry logic (max ${maxRetries} retries)`)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n[${new Date().toISOString()}] 📍 Attempt ${attempt + 1}/${maxRetries + 1}`)

      const result = await fn()

      if (attempt > 0) {
        console.log(`\n[${new Date().toISOString()}] ✅ Retry succeeded on attempt ${attempt + 1}`)
      } else {
        console.log(`\n[${new Date().toISOString()}] ✅ First attempt succeeded`)
      }

      return result

    } catch (error) {
      console.error(`\n[${new Date().toISOString()}] ❌ Attempt ${attempt + 1} failed: ${error.message}`)

      const willRetry = attempt < maxRetries
      console.log(`  Will retry: ${willRetry}`)

      if (!willRetry) {
        console.error(`\n[${new Date().toISOString()}] 🚫 All retry attempts exhausted`)
        throw error
      }

      // Exponential backoff with jitter
      const delay = Math.floor(Math.random() * initialDelay * Math.pow(2, attempt))
      console.log(`  ⏳ Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Main test function
 */
async function testModalAPI() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  TEST A: Direct Node.js Modal API Test')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`\n[${new Date().toISOString()}] 🧪 Starting Modal API test...`)
  console.log(`\nTest Configuration:`)
  console.log(`  Modal URL: ${MODAL_URL}`)
  console.log(`  Timeout: ${TIMEOUT_MS}ms (${TIMEOUT_MS / 1000}s)`)
  console.log(`  Max Retries: ${MAX_RETRIES}`)
  console.log(`  Test Rows: ${TEST_PAYLOAD.rows.length}`)
  console.log(`\nTest Payload:`)
  console.log(JSON.stringify(TEST_PAYLOAD, null, 2))

  const overallStartTime = Date.now()

  try {
    const response = await withRetry(
      () => fetchWithTimeout(
        MODAL_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(TEST_PAYLOAD)
        },
        TIMEOUT_MS
      ),
      {
        maxRetries: MAX_RETRIES,
        initialDelay: 2000
      }
    )

    console.log(`\n[${new Date().toISOString()}] 📥 Parsing response...`)
    const data = await response.json()

    const totalDuration = Date.now() - overallStartTime

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('  ✅ TEST PASSED - Modal API Call Successful')
    console.log('═══════════════════════════════════════════════════════════')
    console.log(`\nTotal Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`)
    console.log(`\nResponse Data:`)
    console.log(JSON.stringify(data, null, 2))

    // Validate response structure
    console.log(`\n📊 Response Validation:`)
    console.log(`  success: ${data.success}`)
    console.log(`  status: ${data.status}`)
    console.log(`  results count: ${data.results?.length || 0}`)

    if (data.results && data.results.length > 0) {
      console.log(`  first result status: ${data.results[0].status}`)
      if (data.results[0].data?.prompt_executor?.data?.output) {
        console.log(`  ✅ Output structure is correct`)
        console.log(`  Sample output: ${data.results[0].data.prompt_executor.data.output.substring(0, 100)}...`)
      }
    }

    console.log('\n🎉 CONCLUSION: Modal API is working correctly!')
    console.log('   Issue is likely Vercel-specific or in fire-and-forget pattern.\n')

    process.exit(0)

  } catch (error) {
    const totalDuration = Date.now() - overallStartTime

    console.error('\n═══════════════════════════════════════════════════════════')
    console.error('  ❌ TEST FAILED - Modal API Call Failed')
    console.error('═══════════════════════════════════════════════════════════')
    console.error(`\nTotal Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`)
    console.error(`\nError Details:`)
    console.error(`  Type: ${error.constructor.name}`)
    console.error(`  Name: ${error.name}`)
    console.error(`  Message: ${error.message}`)
    console.error(`\nFull Error:`)
    console.error(error)

    console.error('\n🔍 CONCLUSION: Modal API call failed from Node.js')
    console.error('   Check network connectivity, Modal deployment status, or payload format.\n')

    process.exit(1)
  }
}

// Run the test
testModalAPI()
