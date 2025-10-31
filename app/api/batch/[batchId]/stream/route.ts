import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { releaseBatch } from '@/middleware/rateLimits'
import { authenticateRequest } from '@/lib/auth-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/batch/[batchId]/stream
 * Server-Sent Events endpoint for real-time batch progress
 *
 * Streams batch_results as they complete
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  const { batchId } = params

  // Authenticate request
  const userId = await authenticateRequest(request)
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastResultCount = 0
      let isComplete = false

      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Poll for updates every 2 seconds
      const interval = setInterval(async () => {
        try {
          // Get batch status (verify ownership)
          const { data: batch } = await supabaseAdmin
            .from('batches')
            .select('status, total_rows, processed_rows, user_id')
            .eq('id', batchId)
            .eq('user_id', userId)
            .single()

          if (!batch) {
            sendEvent('error', { message: 'Batch not found or access denied' })
            clearInterval(interval)
            controller.close()
            return
          }

          // Get new results
          const { data: results } = await supabaseAdmin
            .from('batch_results')
            .select('*')
            .eq('batch_id', batchId)
            .order('row_index', { ascending: true })

          const currentResultCount = results?.length || 0

          // Send new results if any
          if (currentResultCount > lastResultCount) {
            const newResults = results?.slice(lastResultCount) || []
            for (const result of newResults) {
              sendEvent('result', {
                id: result.id,
                row_index: result.row_index,
                status: result.status,
                output_data: result.output_data,
                error_message: result.error_message,
                input_data: result.input_data,
              })
            }
            lastResultCount = currentResultCount
          }

          // Calculate completed count (only rows that finished processing)
          const completedCount = results?.filter(r =>
            r.status === 'success' || r.status === 'error'
          ).length || 0

          // Send progress update
          sendEvent('progress', {
            total: batch.total_rows || 0,
            completed: completedCount,
            status: batch.status,
          })

          // Check if complete
          if (batch.status === 'completed' || batch.status === 'completed_with_errors' || batch.status === 'failed') {
            if (!isComplete) {
              sendEvent('complete', {
                status: batch.status,
                total: batch.total_rows,
                processed: batch.processed_rows,
              })
              isComplete = true
              
              // Release rate limit when batch completes
              if (batch.user_id) {
                releaseBatch(batch.user_id)
              }
            }
            clearInterval(interval)
            controller.close()
          }
        } catch (error) {
          console.error('Stream error:', error)
          sendEvent('error', { message: 'Stream error' })
          clearInterval(interval)
          controller.close()
        }
      }, 2000) // Poll every 2 seconds

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
