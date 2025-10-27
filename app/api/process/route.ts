import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, createServerSupabaseClient } from '@/lib/supabase'
import { validatePrompt } from '@/lib/validation'
import type { OutputColumn } from '@/lib/types'
import { checkRateLimits, releaseBatch } from '@/middleware/rateLimits'
import { logError } from '@/lib/errors'
import { devLog } from '@/lib/dev-logger'
import { fetchWithRetry } from '@/lib/retry'

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
    // Get user from session (cookie-based) or Bearer token
    const authHeader = request.headers.get('Authorization')
    const supabase = await createServerSupabaseClient()

    let user = null
    let authError = null

    if (authHeader?.startsWith('Bearer ')) {
      // API token auth (for curl/n8n)
      const token = authHeader.slice(7)
      const { data, error } = await supabase.auth.getUser(token)
      user = data.user
      authError = error
    } else {
      // Cookie-based auth (for browser)
      const { data, error } = await supabase.auth.getUser()
      user = data.user
      authError = error
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in or provide valid Bearer token' },
        { status: 401 }
      )
    }
    
    // Store userId for error handling
    userId = user.id

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

    // Check rate limits
    const rateLimitCheck = checkRateLimits(user.id, rows.length)
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
          user_id: user.id,
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

    // Invoke Modal processor asynchronously (fire and forget)
    const modalUrl = process.env.MODAL_API_URL || 'https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run'
    
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    invokeModalAsync(modalUrl, batchId, rows, prompt, context, outputColumns, webhookUrl).catch((error) => {
      logError(error instanceof Error ? error : new Error('Modal invocation failed'), {
        source: 'api/process/POST/invokeModalAsync',
        batchId
      })
      // Mark batch as failed (best effort, don't block response)
      markBatchFailed(batchId)
      // Release rate limit on failure
      releaseBatch(user.id)
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
 * Invoke Modal processor without waiting for response (fire and forget)
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
    const payload = {
      batch_id: batchId,
      rows,
      prompt,
      context,
      output_schema: outputColumns,
      webhook_url: webhookUrl,
    }

    const bodyString = JSON.stringify(payload)

    const response = await fetchWithRetry(modalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Batch-ID': batchId,
      },
      body: bodyString,
      timeoutMs: 30000, // 30 seconds timeout
      retryOptions: {
        maxRetries: 3,
        initialDelay: 1000, // 1 second
        maxDelay: 10000, // 10 seconds (faster for API endpoint)
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Modal returned ${response.status}: ${errorText}`)
    }

    devLog.log(`Modal request successful for batch ${batchId}, status: ${response.status}`)
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Modal request failed'), {
      source: 'api/process/invokeModalAsync',
      batchId,
      modalUrl
    })
    throw error // Re-throw to trigger catch handler
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






