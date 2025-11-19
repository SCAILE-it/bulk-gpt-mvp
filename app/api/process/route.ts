import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, createServerSupabaseClient } from '@/lib/supabase'
import { validatePrompt } from '@/lib/validation'
import { checkRateLimits, releaseBatch } from '@/middleware/rateLimits'
import { logError, logDebug, logWarning } from '@/lib/utils/logger'
import { authenticateRequest } from '@/lib/auth-middleware'
import { checkUsageLimits } from '@/lib/api-keys'
import { GTMAPIClient } from '@/lib/api/gtm-client'
import type { EnrichRowResponse } from '@/lib/types/gtm-types'
import { createResourcesFromBatch } from '@/lib/utils/batch-to-resources'

export const maxDuration = 60 // Max 60 seconds to create batch and invoke Modal

// INPUT VALIDATION HELPERS
/**
 * Validate batch rows structure
 */
function validateBatchRows(rows: unknown[]): void {
  const MAX_ROWS = 10000
  if (rows.length > MAX_ROWS) {
    throw new Error(`Maximum ${MAX_ROWS} rows allowed per batch`)
  }

  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Row ${index} must be an object`)
    }

    const keys = Object.keys(row as object)
    if (keys.length === 0) {
      throw new Error(`Row ${index} cannot be empty`)
    }

    // Check all values are strings or primitives
    keys.forEach((key) => {
      const value = (row as Record<string, unknown>)[key]
      if (value !== null && value !== undefined && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        throw new Error(`Row ${index} field "${key}" must be a string, number, or boolean`)
      }
    })
  })
}

/**
 * Validate output columns configuration
 */
function validateOutputColumns(cols: unknown[]): void {
  const MAX_COLS = 50
  if (cols.length > MAX_COLS) {
    throw new Error(`Maximum ${MAX_COLS} output columns allowed`)
  }

  cols.forEach((col, index) => {
    if (typeof col !== 'string') {
      throw new Error(`Column ${index} name must be a string`)
    }
    if (col.length === 0) {
      throw new Error(`Column ${index} name cannot be empty`)
    }
    if (col.length > 255) {
      throw new Error(`Column ${index} name cannot exceed 255 characters`)
    }
    // Check for invalid characters
    if (!/^[a-zA-Z0-9_\s-]+$/.test(col)) {
      throw new Error(`Column ${index} name contains invalid characters`)
    }
  })
}

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
 *   webhookUrl?: string,
 *   tools?: string[]
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

    const { csvFilename, rows, prompt, context = '', outputColumns = [], tools = [], testMode = false, selectedInputColumns } = body

    // Validate batch rows structure
    try {
      validateBatchRows(rows)
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid row structure' },
        { status: 400 }
      )
    }

    // Validate output columns if provided
    if (Array.isArray(outputColumns) && outputColumns.length > 0) {
      try {
        validateOutputColumns(outputColumns)
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : 'Invalid output columns' },
          { status: 400 }
        )
      }
    }

    // Check usage limits (database-backed)
    // testMode bypasses batch limit but still checks row limit
    const usageLimitCheck = await checkUsageLimits(userId, rows.length, testMode)
    if (!usageLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: usageLimitCheck.reason,
          batchesToday: usageLimitCheck.batchesToday,
          dailyBatchLimit: usageLimitCheck.dailyBatchLimit,
          rowsToday: usageLimitCheck.rowsToday,
          dailyRowLimit: usageLimitCheck.dailyRowLimit,
          resetTime: usageLimitCheck.resetTime,
          testMode
        },
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

    // ========================================================================
    // GTM BACKEND ROUTING - Process with enrichment tools if selected
    // ========================================================================
    if (tools && tools.length > 0) {
      logDebug(`[GTM] Tools selected (${tools.length}): ${tools.join(', ')}`)

      try {
        // Get user session token for GTM authentication
        const supabase = await createServerSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()

        const authToken = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

        if (!authToken) {
          logWarning('[GTM] No auth token available, falling back to Modal')
          // Fall through to Modal processor below
        } else {
          logDebug('[GTM] Calling GTM backend with auth token')

          // Create GTM client with authentication
          const gtmClient = new GTMAPIClient({ authToken })

          // Call GTM backend to enrich batch
          const gtmResponse = await gtmClient.enrichBatch({
            rows: rows,
            tools: tools,
          })

          logDebug('[GTM] Batch enrichment successful:', {
            totalRows: gtmResponse.totalRows,
            successfulRows: gtmResponse.successfulRows,
            failedRows: gtmResponse.failedRows,
          })

          // Create batch record in database
          const batchId = gtmResponse.batchId

          const { error: batchInsertError } = await supabaseAdmin
            .from('batches')
            .insert({
              id: batchId,
              user_id: userId,
              csv_filename: csvFilename,
              total_rows: rows.length,
              status: gtmResponse.failedRows === 0 ? 'completed' : 'completed_with_errors',
              prompt: prompt,
              tools: tools,
              selected_input_columns: selectedInputColumns && Array.isArray(selectedInputColumns) ? selectedInputColumns : null,
            })

          if (batchInsertError) {
            logError('Failed to create GTM batch record', batchInsertError, {
              source: 'api/process/GTM',
              batchId
            })
            // Continue anyway - data is enriched, just can't track in DB
          }

          // Store individual results in database
          const resultsToInsert = gtmResponse.results.map((result: EnrichRowResponse, index: number) => ({
            batch_id: batchId,
            row_index: index,
            input_data: result.input,
            output_data: result.data,
            status: result.success ? 'success' : 'error',
            error_message: result.success ? null : 'Enrichment failed',
            input_tokens: 0, // GTM doesn't provide token counts
            output_tokens: 0,
          }))

          const { error: resultsInsertError } = await supabaseAdmin
            .from('batch_results')
            .insert(resultsToInsert)

          if (resultsInsertError) {
            logError('Failed to store GTM results', resultsInsertError, {
              source: 'api/process/GTM',
              batchId
            })
          }

          // Create resources from batch results (for GTM/bulk-agent)
          // Don't await - let it run in background with timeout protection
          const BACKGROUND_TIMEOUT_MS = 30000 // 30 seconds max (route has 60s total)
          Promise.race([
            createResourcesFromBatch(batchId),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Resource creation timeout')), BACKGROUND_TIMEOUT_MS)
            ),
          ]).catch((error) => {
            logError('[PROCESS] Error creating resources (non-fatal)', error)
            // Don't fail the request - this is background work
          })

          // Return success response (batch complete immediately - no Modal polling needed)
          return NextResponse.json(
            {
              success: true,
              batchId,
              status: gtmResponse.failedRows === 0 ? 'completed' : 'completed_with_errors',
              totalRows: gtmResponse.totalRows,
              message: `GTM enrichment complete. ${gtmResponse.successfulRows}/${gtmResponse.totalRows} rows processed successfully.`,
            },
            { status: 200 }
          )
        }
      } catch (gtmError) {
        // Log GTM error but don't fail - fall back to Modal processor
        logError('GTM enrichment failed, falling back to Modal', gtmError, {
          source: 'api/process/GTM_FALLBACK',
          tools,
          rowCount: rows.length
        })
        // Fall through to Modal processor below
      }
    }

    // ========================================================================
    // MODAL PROCESSOR - Default flow (no tools) or fallback if GTM fails
    // ========================================================================
    // Create batch record in Supabase with cryptographically secure ID
    const batchId = `batch_${crypto.randomUUID()}`
    
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
          tools: tools.length > 0 ? tools : null,
          selected_input_columns: selectedInputColumns && Array.isArray(selectedInputColumns) ? selectedInputColumns : null,
        })
        .select()

      if (error) {
        logError('Failed to create batch', error, {
          source: 'api/process/POST',
          batchId
        })
        return NextResponse.json(
          { error: 'Failed to create batch in database' },
          { status: 500 }
        )
      }
    } catch (dbError) {
      logError('Database error', dbError, {
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
            ? outputColumns.map((col: string) => ({ name: col }))
            : null,
        })
        .eq('id', batchId)

      if (updateError) {
        logWarning('[POLLING] Failed to update batch with processing data', { updateError })
        // Continue anyway - batch is created, Modal can still try to process
      }
    } catch (updateErr) {
      logWarning('[POLLING] Error updating batch data', { updateErr })
    }

    // No HTTP call to Modal - Modal will poll database for pending batches
    logDebug('[POLLING] Batch created and marked as pending')
    logDebug('[POLLING] Modal poller will pick up batch within 10 seconds')
    logDebug(`[POLLING] Batch ID: ${batchId}, Rows: ${rows.length}`)

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
      logError('Process API error', error, {
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






