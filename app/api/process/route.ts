import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validatePrompt } from '@/lib/validation'

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
 *   outputColumns?: string[]
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
  try {
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

    // Create batch record in Supabase
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      const { error } = await supabase
        .from('batches')
        .insert({
          id: batchId,
          csv_filename: csvFilename,
          total_rows: rows.length,
          status: 'pending',
          prompt: prompt,
        })
        .select()

      if (error) {
        console.error('Failed to create batch:', error)
        return NextResponse.json(
          { error: 'Failed to create batch in database' },
          { status: 500 }
        )
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // Create batch results records (all as 'pending' initially)
    try {
      const batchResults = rows.map((row, idx) => ({
        id: `${batchId}-row-${idx}`,
        batch_id: batchId,
        input: JSON.stringify(row),
        status: 'pending',
        output: '',
        error: null,
      }))

      const { error: resultsError } = await supabase
        .from('batch_results')
        .insert(batchResults)

      if (resultsError) {
        console.error('Failed to create batch results:', resultsError)
        // Continue anyway, Modal will create them on demand
      }
    } catch (resultsDbError) {
      console.error('Batch results insertion error:', resultsDbError)
      // Continue anyway, not fatal
    }

    // Invoke Modal processor asynchronously (fire and forget)
    const modalUrl = process.env.MODAL_API_URL || 'https://bulk-gpt-processor-mvp--process-batch.modal.run'
    
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    invokeModalAsync(modalUrl, batchId, rows, prompt, context, outputColumns).catch((error) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to invoke Modal for batch ${batchId}:`, error)
      // Mark batch as failed (best effort, don't block response)
      markBatchFailed(batchId)
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
    console.error('POST /api/process error:', error)
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
  outputColumns: string[]
): Promise<void> {
  // Fire request without awaiting
  fetch(modalUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Batch-ID': batchId,
    },
    body: JSON.stringify({
      batch_id: batchId,
      rows,
      prompt,
      context,
      output_schema: outputColumns,
    }),
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(`Modal request failed for batch ${batchId}:`, error)
  })
}

/**
 * Mark batch as failed in database (best effort)
 */
async function markBatchFailed(batchId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    supabase
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






