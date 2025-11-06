import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logError } from '@/lib/errors'
import { devLog } from '@/lib/dev-logger'

export const maxDuration = 300 // 5 minutes to process webhook

/**
 * POST /api/webhook/modal-callback
 *
 * Webhook endpoint for Modal to call when batch processing completes.
 *
 * Modal calls this endpoint with results when done processing.
 * We store the results in the database and update batch status.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now()

  try {
    // TODO: Add webhook secret validation once Modal sends x-webhook-secret header
    // See modal-processor/main.py fire_webhook() function for Phase 2 implementation

    console.log('\n[WEBHOOK] ========== Modal Callback Received ==========')
    console.log(`[WEBHOOK] Timestamp: ${new Date().toISOString()}`)

    // Parse webhook payload
    const payload = await request.json()
    console.log('[WEBHOOK] Payload keys:', Object.keys(payload))

    const { batch_id, results, status, total_rows, successful, failed } = payload

    if (!batch_id) {
      console.error('[WEBHOOK] Missing batch_id in payload')
      return NextResponse.json(
        { error: 'Missing batch_id' },
        { status: 400 }
      )
    }

    console.log(`[WEBHOOK] Batch ID: ${batch_id}`)
    console.log(`[WEBHOOK] Status: ${status}`)
    console.log(`[WEBHOOK] Total rows: ${total_rows}`)
    console.log(`[WEBHOOK] Results count: ${results?.length || 0}`)

    // Verify batch exists
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, user_id, total_rows')
      .eq('id', batch_id)
      .single()

    if (batchError || !batch) {
      console.error('[WEBHOOK] Batch not found:', batch_id)
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    console.log(`[WEBHOOK] Batch found, user_id: ${batch.user_id}`)

    // Transform and store results
    if (results && Array.isArray(results)) {
      console.log(`[WEBHOOK] Transforming ${results.length} results...`)
      await transformAndStoreBatchResults(batch_id, results)
      console.log('[WEBHOOK] Results stored successfully')
    } else {
      console.warn('[WEBHOOK] No results provided or invalid format')
    }

    // Update batch status
    const updateData: Record<string, unknown> = {
      status: status === 'completed' ? 'completed' : 'completed_with_errors',
      processed_rows: total_rows || batch.total_rows,  // Note: 'processed_rows', not 'completed_rows'
    }

    console.log('[WEBHOOK] Updating batch status:', updateData.status)

    const { error: updateError } = await supabaseAdmin
      .from('batches')
      .update(updateData)
      .eq('id', batch_id)

    if (updateError) {
      console.error('[WEBHOOK] Failed to update batch:', updateError)
      throw updateError
    }

    const duration = Date.now() - startTime

    console.log(`[WEBHOOK] ========== Webhook Processed Successfully ==========`)
    console.log(`[WEBHOOK] Duration: ${duration}ms`)
    console.log('')

    devLog.log(`Modal webhook received for batch ${batch_id}: ${status}`, {
      totalRows: total_rows,
      successful,
      failed,
      duration
    })

    return NextResponse.json({
      success: true,
      batch_id,
      message: 'Results processed successfully',
      rowsProcessed: total_rows,
      status: status === 'completed' ? 'completed' : 'completed_with_errors'
    })

  } catch (error) {
    const duration = Date.now() - startTime

    console.error('\n[WEBHOOK] ========== Webhook Processing Failed ==========')
    console.error(`[WEBHOOK] Duration: ${duration}ms`)
    console.error(`[WEBHOOK] Error type:`, typeof error)
    console.error(`[WEBHOOK] Error:`, error)
    console.error(`[WEBHOOK] Error string:`, String(error))
    console.error(`[WEBHOOK] Error JSON:`, JSON.stringify(error, null, 2))
    console.error('')

    logError(error instanceof Error ? error : new Error('Webhook processing failed'), {
      source: 'api/webhook/modal-callback',
      duration,
      errorDetails: error
    })

    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null
      ? JSON.stringify(error)
      : String(error)

    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

/**
 * Transform Modal V2's response format and store in batch_results table
 *
 * V2 format: { status: "success", data: { "prompt-executor": { data: { output: "..." } } } }
 * Our format: { batch_id, row_index, input, output, status, error }
 */
async function transformAndStoreBatchResults(
  batchId: string,
  v2Results: unknown[]
): Promise<void> {
  try {
    console.log(`[WEBHOOK] Transforming ${v2Results.length} results for batch ${batchId}`)

    const batchResults = v2Results.map((result, index) => {
      const v2Result = result as {
        status: string
        data?: {
          [key: string]: {
            data?: {
              output?: string
              prompt?: string
              rendered_prompt?: string
            }
          }
        }
        row_index?: number
        error?: string
      }

      // Extract output from nested V2 structure
      let output: string | null = null
      let error: string | null = null
      let status: 'success' | 'error' = 'error'
      const inputData: Record<string, unknown> = {}

      if (v2Result.status === 'success' && v2Result.data) {
        // V2 returns: data.prompt_executor.data.output (underscore, not hyphen!)
        const promptExecutorData = v2Result.data['prompt_executor'] || v2Result.data['prompt-executor']

        if (promptExecutorData && promptExecutorData.data && promptExecutorData.data.output) {
          const rawOutput = promptExecutorData.data.output
          // Output can be a string or an object (multiple columns)
          output = typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput)
          status = 'success'
        }

        // Extract input data if available
        if (v2Result.data) {
          const dataKeys = Object.keys(v2Result.data)
          for (const key of dataKeys) {
            if (key !== 'prompt_executor' && key !== 'prompt-executor') {
              inputData[key] = v2Result.data[key]
            }
          }
        }
      } else if (v2Result.status === 'error') {
        error = v2Result.error || 'Unknown error'
        status = 'error'
      }

      const rowIndex = v2Result.row_index !== undefined ? v2Result.row_index : index

      // Generate unique ID for each result
      const resultId = `${batchId}_row_${rowIndex}`

      return {
        id: resultId,
        batch_id: batchId,
        row_index: rowIndex,
        input_data: JSON.stringify(inputData),
        output_data: output || '',
        status,
        error_message: error || null,
      }
    })

    console.log(`[WEBHOOK] Inserting ${batchResults.length} batch_results...`)

    // Insert batch_results in bulk
    const { error: insertError } = await supabaseAdmin
      .from('batch_results')
      .insert(batchResults)

    if (insertError) {
      console.error('[WEBHOOK] Insert error:', insertError)
      throw new Error(`Failed to store batch results: ${insertError.message}`)
    }

    const successCount = batchResults.filter(r => r.status === 'success').length
    const errorCount = batchResults.filter(r => r.status === 'error').length

    console.log(`[WEBHOOK] Stored ${batchResults.length} results (${successCount} success, ${errorCount} errors)`)

    devLog.log(`Stored ${batchResults.length} results for batch ${batchId}:`, {
      success: successCount,
      error: errorCount
    })

  } catch (error) {
    console.error('[WEBHOOK] Transform/store failed:', error)
    logError(error instanceof Error ? error : new Error('Failed to transform V2 results'), {
      source: 'api/webhook/modal-callback/transformAndStoreBatchResults',
      batchId
    })
    throw error
  }
}

/**
 * GET handler - return webhook info
 */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    {
      endpoint: '/api/webhook/modal-callback',
      method: 'POST',
      description: 'Webhook endpoint for Modal batch processing completion',
      expected_payload: {
        batch_id: 'string',
        status: 'completed | failed',
        total_rows: 'number',
        successful: 'number',
        failed: 'number',
        results: 'array'
      }
    },
    { status: 200 }
  )
}
