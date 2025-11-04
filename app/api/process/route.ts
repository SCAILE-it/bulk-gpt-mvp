import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validatePrompt } from '@/lib/validation'
import type { OutputColumn } from '@/lib/types'
import { checkRateLimits, releaseBatch } from '@/middleware/rateLimits'
import { logError } from '@/lib/errors'
import { devLog } from '@/lib/dev-logger'
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

    const { csvFilename, rows, prompt, context = '', outputColumns = [] } = body

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

    // Invoke V2 Modal processor with webhook callback (fire and forget)
    const modalUrl = process.env.MODAL_API_URL || 'https://scaile--g-mcp-tools-v2-api.modal.run/bulk/generic'

    // Construct webhook URL for Modal to call when done
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const webhookCallbackUrl = `${appUrl}/api/webhook/modal-callback`

    // Fire-and-forget: Call Modal without waiting for response
    // Modal will call our webhook when done
    invokeModalFireAndForget(
      modalUrl,
      batchId,
      rows,
      prompt,
      context,
      outputColumns,
      webhookCallbackUrl
    ).catch((error) => {
      console.error('[DEBUG] Modal invocation failed:', error)
      logError(error instanceof Error ? error : new Error('Modal invocation failed'), {
        source: 'api/process/POST/invokeModalFireAndForget',
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
 * Invoke V2 Modal processor with webhook callback (fire and forget)
 *
 * This function calls Modal API without waiting for the response.
 * Modal will process the batch asynchronously and call our webhook when done.
 *
 * NOTE: fetch() is attempted but we don't wait. If Vercel → Modal is blocked,
 * the call will fail silently. Modal team must call the webhook from their side.
 */
async function invokeModalFireAndForget(
  modalUrl: string,
  batchId: string,
  rows: Record<string, string>[],
  prompt: string,
  context: string,
  outputColumns: OutputColumn[],
  webhookUrl: string
): Promise<void> {
  try {
    console.log('[MODAL] ========== Fire-and-Forget Invocation ==========')
    console.log(`[MODAL] Batch ID: ${batchId}`)
    console.log(`[MODAL] Modal URL: ${modalUrl}`)
    console.log(`[MODAL] Webhook URL: ${webhookUrl}`)
    console.log(`[MODAL] Rows: ${rows.length}`)

    // V2 payload format with webhook callback
    const payload = {
      batch_id: batchId,  // Pass batch_id so Modal can include it in webhook
      rows,
      prompt,
      output_schema: outputColumns,
      context: context || undefined,
      temperature: 0.7,
      max_tokens: 8192,
      webhook_url: webhookUrl,  // Modal will POST to this when done
    }

    const bodyString = JSON.stringify(payload)
    console.log(`[MODAL] Payload size: ${bodyString.length} bytes`)

    // Attempt to call Modal (will likely fail due to network blocking)
    // This is fire-and-forget - we don't wait for response
    console.log('[MODAL] Attempting fetch to Modal...')

    fetch(modalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyString,
      // Short timeout since we're not waiting anyway
      signal: AbortSignal.timeout(10000), // 10 seconds
    })
      .then(response => {
        console.log(`[MODAL] Modal accepted request: ${response.status}`)
        devLog.log(`Modal request sent for batch ${batchId}`)
      })
      .catch(error => {
        // Expected to fail due to Vercel → Modal network blocking
        console.warn('[MODAL] Fetch to Modal failed (expected if network blocked):', error.message)
        console.warn('[MODAL] Modal team should call webhook directly with batch results')
      })

    console.log('[MODAL] Fire-and-forget invocation complete (not waiting for response)')
    console.log('[MODAL] Modal will call webhook when processing is done')
    console.log('[MODAL] ==========================================')

  } catch (error) {
    console.error('[MODAL] Fire-and-forget invocation error:', error)
    logError(error instanceof Error ? error : new Error('Modal fire-and-forget failed'), {
      source: 'api/process/invokeModalFireAndForget',
      batchId,
      modalUrl
    })
    // Don't throw - this is fire-and-forget
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






