import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validatePrompt } from '@/lib/validation'
import { checkRateLimits, releaseBatch } from '@/middleware/rateLimits'
import { logError } from '@/lib/errors'
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

    // Store batch data and configuration for Modal polling
    try {
      const { error: updateError} = await supabaseAdmin
        .from('batches')
        .update({
          data: rows,  // Supabase automatically handles JSON for jsonb columns
          prompt: prompt,
          context: context || '',
          output_schema: outputColumns && outputColumns.length > 0
            ? outputColumns.map(col => ({ name: col }))  // col is already a string
            : null,
        })
        .eq('id', batchId)

      if (updateError) {
        console.warn('[POLLING] Failed to update batch with processing data:', updateError)
        // Continue anyway - batch is created, Modal can still try to process
      }
    } catch (updateErr) {
      console.warn('[POLLING] Error updating batch data:', updateErr)
    }

    // No HTTP call to Modal - Modal will poll database for pending batches
    console.log('[POLLING] Batch created and marked as pending')
    console.log('[POLLING] Modal poller will pick up batch within 10 seconds')
    console.log(`[POLLING] Batch ID: ${batchId}, Rows: ${rows.length}`)

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
 * Handle unsupported methods
 */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST /api/process to start a batch' },
    { status: 405 }
  )
}






