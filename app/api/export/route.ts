import { NextRequest, NextResponse } from 'next/server'
import { exportToCSV, exportToJSON } from '@/lib/export'
import { logError } from '@/lib/errors'
import { formatOutputValue } from '@/lib/utils/format-output'

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

    // Flatten batch results structure for export
    // Each result has: { input_data: {...}, output_data: {...}, status, error_message }
    const flattenedResults = results.map((result: Record<string, unknown>) => {
      const flat: Record<string, unknown> = {}

      // Spread input fields (name, company, etc.)
      if (result.input_data && typeof result.input_data === 'object') {
        Object.assign(flat, result.input_data)
      }

      // Add output data (may be string or object) - apply formatting to strip markdown blocks
      if (result.output_data) {
        if (typeof result.output_data === 'string') {
          // Apply formatting to remove markdown code blocks and format JSON
          flat.Output = formatOutputValue(result.output_data)
        } else if (typeof result.output_data === 'object') {
          // For object outputs, format each value
          const formattedOutput: Record<string, string> = {}
          Object.entries(result.output_data as Record<string, unknown>).forEach(([key, value]) => {
            formattedOutput[key] = typeof value === 'string'
              ? formatOutputValue(value)
              : formatOutputValue(JSON.stringify(value))
          })
          Object.assign(flat, formattedOutput)
        }
      }

      // Add status and error
      flat.Status = result.status || 'unknown'
      flat.Error = result.error_message || ''

      return flat
    })

    // Generate filename
    const date = timestamp ? new Date(timestamp) : new Date()
    const dateStr = date.toISOString().split('T')[0]
    const timeStr = date.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')
    const filename = batchId
      ? `results-${batchId}.${format}`
      : `bulk-gpt-export-${dateStr}-${timeStr}.${format}`

    // Generate content based on format
    let content: string
    let contentType: string

    if (format === 'csv') {
      try {
        content = exportToCSV(flattenedResults, { batchId, timestamp })
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
        content = exportToJSON(flattenedResults, { batchId, timestamp })
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

