import { NextRequest, NextResponse } from 'next/server'
import { exportToCSV, exportToJSON } from '@/lib/export'
import { logError } from '@/lib/errors'

/**
 * POST /api/export
 * Export results data to CSV or JSON format
 * 
 * Request body:
 * {
 *   results: Array<Record<string, unknown>>,
 *   format: 'csv' | 'json',
 *   batchId?: string,
 *   timestamp?: string
 * }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json()

    // Validate request body
    if (!body.results || !Array.isArray(body.results)) {
      return NextResponse.json(
        { error: 'results must be an array' },
        { status: 400 }
      )
    }

    if (!body.format || (body.format !== 'csv' && body.format !== 'json')) {
      return NextResponse.json(
        { error: 'format must be either "csv" or "json"' },
        { status: 400 }
      )
    }

    const { results, format, batchId, timestamp } = body

    // Generate filename
    const date = timestamp ? new Date(timestamp) : new Date()
    const dateStr = date.toISOString().split('T')[0]
    const timeStr = date.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')
    const filename = batchId
      ? `bulk-gpt-${batchId}.${format}`
      : `bulk-gpt-export-${dateStr}-${timeStr}.${format}`

    // Generate content based on format
    let content: string
    let contentType: string

    if (format === 'csv') {
      try {
        content = exportToCSV(results, { batchId, timestamp })
        contentType = 'text/csv'
      } catch (err) {
        const error = err instanceof Error ? err : new Error('CSV export failed')
        logError(error, { format, resultsCount: results.length })
        return NextResponse.json(
          { error: 'Failed to generate CSV' },
          { status: 500 }
        )
      }
    } else {
      // format === 'json'
      try {
        content = exportToJSON(results, { batchId, timestamp })
        contentType = 'application/json'
      } catch (err) {
        const error = err instanceof Error ? err : new Error('JSON export failed')
        logError(error, { format, resultsCount: results.length })
        return NextResponse.json(
          { error: 'Failed to generate JSON' },
          { status: 500 }
        )
      }
    }

    // Return file response with appropriate headers
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': content.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, { endpoint: '/api/export' })

    return NextResponse.json(
      {
        error: 'Export failed',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
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
    { error: 'Method not allowed. Use POST /api/export' },
    { status: 405 }
  )
}

