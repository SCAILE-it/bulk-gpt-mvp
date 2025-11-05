/**
 * Test Helper: Invoke Modal Directly
 *
 * Workaround for Vercel → Modal network blocking issue.
 * This helper calls Modal API directly from Node.js (which CAN reach Modal)
 * and waits for processing to complete.
 *
 * Used in E2E tests to bypass the Vercel network limitation.
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const dotenv = require('dotenv')
    const path = require('path')
    dotenv.config({ path: path.join(__dirname, '../../.env.local') })
  } catch (err) {
    // dotenv not available, continue
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Use Modal V2 endpoint (works correctly)
const MODAL_URL = 'https://scaile--g-mcp-tools-v2-api.modal.run/bulk/generic'

export interface InvokeModalOptions {
  batchId: string
  rows: Array<Record<string, string>>
  prompt: string
  context?: string
  outputColumns?: Array<{ name: string }>
  webhookUrl: string
  maxWaitSeconds?: number
}

/**
 * Invoke Modal directly and wait for completion
 *
 * This function:
 * 1. Calls Modal V2 API directly (Node.js can reach it)
 * 2. Waits for Modal to process (either webhook or polling)
 * 3. Returns when batch status is 'completed' or 'completed_with_errors'
 */
export async function invokeModal(options: InvokeModalOptions): Promise<void> {
  const {
    batchId,
    rows,
    prompt,
    context = '',
    outputColumns = [],
    webhookUrl,
    maxWaitSeconds = 120
  } = options

  console.log('\n[INVOKE-MODAL] ========== Direct Modal Invocation ==========')
  console.log(`[INVOKE-MODAL] Batch ID: ${batchId}`)
  console.log(`[INVOKE-MODAL] Rows: ${rows.length}`)
  console.log(`[INVOKE-MODAL] Webhook URL: ${webhookUrl}`)

  // Build Modal V2 payload
  const payload: Record<string, unknown> = {
    rows,
    prompt,
    temperature: 0.7,
    max_tokens: 8192,
    webhook_url: webhookUrl,
  }

  if (outputColumns && outputColumns.length > 0) {
    payload.output_schema = outputColumns.map(col => ({ name: col.name }))
  }

  if (context && context.trim()) {
    payload.context = context
  }

  try {
    console.log('[INVOKE-MODAL] Calling Modal API...')

    const response = await fetch(MODAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Modal API returned ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()
    console.log('[INVOKE-MODAL] Modal response:', JSON.stringify(result, null, 2))

    // Modal V2 can respond synchronously OR asynchronously
    if (result.status === 'completed' || result.status === 'completed_with_errors') {
      console.log('[INVOKE-MODAL] Modal processed synchronously, calling webhook...')

      // Modal processed synchronously, call webhook ourselves
      await callWebhook(webhookUrl, batchId, result)

      console.log('[INVOKE-MODAL] ✅ Processing complete (synchronous)')
      return
    }

    // If async, poll for completion
    console.log('[INVOKE-MODAL] Modal processing asynchronously, polling for completion...')
    await pollForCompletion(batchId, maxWaitSeconds)
    console.log('[INVOKE-MODAL] ✅ Processing complete (async)')

  } catch (error) {
    console.error('[INVOKE-MODAL] ❌ Error:', error)
    throw error
  } finally {
    console.log('[INVOKE-MODAL] ==========================================\n')
  }
}

/**
 * Call webhook endpoint with Modal results
 */
async function callWebhook(webhookUrl: string, batchId: string, modalResult: any): Promise<void> {
  const webhookPayload = {
    batch_id: batchId,
    status: modalResult.status,
    total_rows: modalResult.total_rows,
    successful: modalResult.successful,
    failed: modalResult.failed,
    results: modalResult.results,
    processing_time_seconds: modalResult.processing_time_seconds,
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  })

  if (!response.ok) {
    throw new Error(`Webhook call failed: ${response.status} ${await response.text()}`)
  }

  console.log('[INVOKE-MODAL] Webhook called successfully')
}

/**
 * Poll batch status until completed
 */
async function pollForCompletion(batchId: string, maxWaitSeconds: number): Promise<void> {
  const startTime = Date.now()
  const pollInterval = 2000 // 2 seconds
  const maxWaitMs = maxWaitSeconds * 1000

  while (Date.now() - startTime < maxWaitMs) {
    const { data: batch, error } = await supabase
      .from('batches')
      .select('status')
      .eq('id', batchId)
      .single()

    if (error) {
      throw new Error(`Failed to check batch status: ${error.message}`)
    }

    console.log(`[INVOKE-MODAL] Batch status: ${batch.status}`)

    if (batch.status === 'completed' || batch.status === 'completed_with_errors') {
      return
    }

    if (batch.status === 'failed' || batch.status === 'cancelled') {
      throw new Error(`Batch ${batch.status}`)
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error(`Batch did not complete within ${maxWaitSeconds} seconds`)
}
