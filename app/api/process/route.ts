import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validatePrompt } from '@/lib/validation'
import type { OutputColumn } from '@/lib/types'
import { checkRateLimits, releaseBatch } from '@/middleware/rateLimits'
import { logError } from '@/lib/errors'
import { devLog } from '@/lib/dev-logger'
import { fetchWithRetry } from '@/lib/retry'
import { authenticateRequest } from '@/lib/auth-middleware'
import { checkUsageLimits } from '@/lib/api-keys'

export const maxDuration = 60 // Max 60 seconds to create batch and invoke Modal

/**
 * POST /api/process
 * Create batch and invoke Modal processor asynchronously
 *
 * Request body:
 * {
 *   csvFilename: string,
 *   rows: Array<Record<string, string>>,
 *   prompt: string,
 *   context?: string,
 *   outputColumns?: OutputColumn[],
 *   webhookUrl?: string
 * }
 *
 * Returns:
 * {
 *   batchId: string,
 *   status: 'pending',
 *   totalRows: number,
 *   message: string
 * }
 */
export async function POST(request: NextRequest): Promise<Response> {
  let userId: string | null = null

  try {
    // Authenticate request (supports cookie, Bearer token, or API key)
    userId = await authenticateRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in or provide valid Bearer token/API key' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.csvFilename || typeof body.csvFilename !== 'string') {
      return NextResponse.json(
        { error: 'csvFilename is required and must be a string' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { error: 'rows is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate prompt
    try {
      validatePrompt(body.prompt)
    } catch (e) {
      return NextResponse.json(
        { error: 'prompt is required and cannot be empty' },
        { status: 400 }
      )
    }

    const { csvFilename, rows, prompt, context = '', outputColumns = [], webhookUrl } = body

    // Check usage limits (database-backed)
    const usageLimitCheck = await checkUsageLimits(userId, rows.length)
    if (!usageLimitCheck.allowed) {
      return NextResponse.json(
        { error: usageLimitCheck.reason },
        { status: 429 }
      )
    }

    // Check rate limits (in-memory, for burst protection)
    const rateLimitCheck = checkRateLimits(userId, rows.length)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitCheck.reason,
          limit: rateLimitCheck.limit,
          current: rateLimitCheck.current,
          beta: true 
        },
        { status: 429 }
      )
    }

    // Create batch record in Supabase
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      const { error } = await supabaseAdmin
        .from('batches')
        .insert({
          id: batchId,
          user_id: userId,
          csv_filename: csvFilename,
          total_rows: rows.length,
          status: 'pending',
          prompt: prompt,
        })
        .select()

      if (error) {
        logError(new Error('Failed to create batch'), {
          source: 'api/process/POST',
          supabaseError: error,
          batchId
        })
        return NextResponse.json(
          { error: 'Failed to create batch in database' },
          { status: 500 }
        )
      }
    } catch (dbError) {
      logError(dbError instanceof Error ? dbError : new Error('Database error'), {
        source: 'api/process/POST/database',
        batchId
      })
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // Skip batch_results pre-creation - Modal will create them as it processes
    // (Supabase PostgREST schema cache issues prevent reliable pre-creation)

    // Invoke V2 Modal processor asynchronously (fire and forget)
    const modalUrl = process.env.MODAL_API_URL || 'https://scaile--g-mcp-tools-v2-api.modal.run/bulk/generic'

    // DEBUG: Log Modal URL being used
    console.log('[DEBUG] Modal URL:', modalUrl)
    console.log('[DEBUG] Batch ID:', batchId)
    console.log('[DEBUG] Rows count:', rows.length)
    console.log('[DEBUG] Starting async Modal invocation...')

    // V2 doesn't need delay - no race condition since it manages its own batch tracking
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    invokeModalAsync(modalUrl, batchId, rows, prompt, context, outputColumns, webhookUrl).catch((error) => {
      console.error('[DEBUG] Modal invocation failed:', error)
      logError(error instanceof Error ? error : new Error('Modal invocation failed'), {
        source: 'api/process/POST/invokeModalAsync',
        batchId
      })
      // Mark batch as failed (best effort, don't block response)
      markBatchFailed(batchId)
      // Release rate limit on failure
      releaseBatch(userId)
    })

    // Return immediately with batch ID
    return NextResponse.json(
      {
        success: true,
        batchId,
        status: 'pending',
        totalRows: rows.length,
        message: `Batch created. Processing started asynchronously. Use /api/batch/${batchId}/status to check progress.`,
      },
      { status: 202 } // 202 Accepted - request accepted but not completed
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logError(error instanceof Error ? error : new Error('Process API error'), {
      source: 'api/process/POST',
      userId
    })
    // Release rate limit on error
    if (userId) {
      releaseBatch(userId)
    }
    return NextResponse.json(
      {
        error: 'Failed to create batch',
        details: message,
      },
      { status: 500 }
    )
  }
}

/**
 * Invoke V2 Modal processor without waiting for response (fire and forget)
 *
 * V2 uses request-level parameters instead of batch_id tracking.
 * Backend manages its own batch_job records in the database.
 */
async function invokeModalAsync(
  modalUrl: string,
  batchId: string,
  rows: Record<string, string>[],
  prompt: string,
  context: string,
  outputColumns: OutputColumn[],
  webhookUrl?: string
): Promise<void> {
  // Use retry logic for Modal API calls (transient failures, rate limits, etc.)
  try {
    console.log('[DEBUG] invokeModalAsync called')
    console.log('[DEBUG] modalUrl:', modalUrl)
    console.log('[DEBUG] batchId:', batchId)

    // V2 payload format - request-level parameters, no batch_id
    const payload = {
      rows,
      prompt,
      output_schema: outputColumns,
      context: context || undefined, // Only include if non-empty
      temperature: 0.7, // V2 default
      max_tokens: 8192, // V2 default
      webhook_url: webhookUrl || undefined,
    }

    console.log('[DEBUG] Payload prepared:', {
      rowsCount: rows.length,
      promptLength: prompt.length,
      outputSchemaLength: outputColumns.length,
      hasContext: !!context,
      hasWebhook: !!webhookUrl
    })

    const bodyString = JSON.stringify(payload)

    console.log('[DEBUG] ========== MODAL API CALL START ==========')
    console.log('[DEBUG] Full Modal URL:', modalUrl)
    console.log('[DEBUG] Payload size:', bodyString.length, 'bytes')
    console.log('[DEBUG] Timeout configured: 120000ms (2 minutes)')
    console.log('[DEBUG] Calling fetchWithRetry now...')

    const startTime = Date.now()

    try {
      const response = await fetchWithRetry(modalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // V2 doesn't use X-Batch-ID - it manages its own batch tracking
        },
        body: bodyString,
        timeoutMs: 120000, // 2 minutes timeout (Modal cold start can take 60-90s)
        retryOptions: {
          maxRetries: 2, // Reduce retries since timeout is higher
          initialDelay: 2000, // 2 seconds
          maxDelay: 10000, // 10 seconds
        },
      })

      const duration = Date.now() - startTime
      console.log(`[DEBUG] ========== MODAL API CALL SUCCESS ==========`)
      console.log(`[DEBUG] Modal responded with status ${response.status} in ${duration}ms`)
      console.log(`[DEBUG] Response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[DEBUG] Modal error response:', errorText)
        throw new Error(`Modal returned ${response.status}: ${errorText}`)
      }

      // V2 returns synchronously for < 1000 rows
      const v2Response = await response.json()
      console.log('[DEBUG] Modal response parsed:', {
        success: v2Response.success,
        hasResults: !!v2Response.results,
        resultsCount: v2Response.results?.length || 0
      })

      // Transform V2 response format to our batch_results format
      if (v2Response.success && v2Response.results) {
        console.log('[DEBUG] Transforming and storing batch results...')
        await transformAndStoreBatchResults(batchId, rows, v2Response.results)
        console.log('[DEBUG] Batch results stored successfully')
      } else {
        console.warn('[DEBUG] No results to store:', v2Response)
      }

      devLog.log(`Modal V2 request successful for batch ${batchId}, status: ${response.status}`)
      console.log('[DEBUG] ========== MODAL API CALL COMPLETE ==========')

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('[DEBUG] ========== MODAL API CALL FAILED ==========')
      console.error('[DEBUG] Error after', duration, 'ms')
      console.error('[DEBUG] Error type:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('[DEBUG] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[DEBUG] Full error:', error)
      console.error('[DEBUG] invokeModalAsync FAILED:', error)
    logError(error instanceof Error ? error : new Error('Modal request failed'), {
      source: 'api/process/invokeModalAsync',
      batchId,
      modalUrl
    })
    throw error // Re-throw to trigger catch handler
  }
}

/**
 * Transform V2's nested response format and store in our batch_results table
 *
 * V2 format: { status: "success", data: { "prompt-executor": { data: { output: "..." } } } }
 * Our format: { id, input, output, status, error }
 */
async function transformAndStoreBatchResults(
  batchId: string,
  rows: Record<string, string>[],
  v2Results: unknown[]
): Promise<void> {
  try {
    const batchResults = v2Results.map((result, index) => {
      const v2Result = result as { status: string; data?: { [key: string]: { data?: { output?: string } } }; error?: string }

      // Extract output from nested V2 structure
      let output: string | null = null
      let error: string | null = null
      let status: 'success' | 'error' = 'error'

      if (v2Result.status === 'success' && v2Result.data) {
        // V2 returns: data.prompt_executor.data.output (underscore, not hyphen!)
        const promptExecutorData = v2Result.data['prompt_executor']
        if (promptExecutorData && promptExecutorData.data && promptExecutorData.data.output) {
          output = promptExecutorData.data.output
          status = 'success'
        }
      } else if (v2Result.status === 'error') {
        error = v2Result.error || 'Unknown error'
        status = 'error'
      }

      return {
        batch_id: batchId,
        row_index: index,
        input_data: rows[index],
        output_data: output,
        status,
        error_message: error,
      }
    })

    // Insert batch_results in bulk
    const { error: insertError } = await supabaseAdmin
      .from('batch_results')
      .insert(batchResults)

    if (insertError) {
      throw new Error(`Failed to store batch results: ${insertError.message}`)
    }

    // Update batch status to completed
    const successCount = batchResults.filter(r => r.status === 'success').length
    const errorCount = batchResults.filter(r => r.status === 'error').length

    await supabaseAdmin
      .from('batches')
      .update({
        status: errorCount === 0 ? 'completed' : 'completed_with_errors',
        completed_rows: batchResults.length,
      })
      .eq('id', batchId)

    devLog.log(`Stored ${batchResults.length} results for batch ${batchId}:`, {
      success: successCount,
      error: errorCount
    })
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Failed to transform V2 results'), {
      source: 'api/process/transformAndStoreBatchResults',
      batchId
    })
    throw error
  }
}

/**
 * Mark batch as failed in database (best effort)
 */
async function markBatchFailed(batchId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    supabaseAdmin
      .from('batches')
      .update({ status: 'failed' })
      .eq('id', batchId)
  } catch {
    // Silently fail, this is best effort
  }
}

/**
 * Handle unsupported methods
 */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST /api/process to start a batch' },
    { status: 405 }
  )
}






