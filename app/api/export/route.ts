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

    // Flatten batch results structure for export
    // Each result has: { input_data: {...}, output_data: {...}, status, error_message }
    const flattenedResults = results.map((result: Record<string, unknown>) => {
      const flat: Record<string, unknown> = {}

      // Spread input fields (name, company, etc.)
      if (result.input_data && typeof result.input_data === 'object') {
        Object.assign(flat, result.input_data)
      }

      // Add output data (may be string or object) - parse and spread as separate columns
      // IMPORTANT: Each output field should be its own column, not a single "AI_Output" column
      if (result.output_data) {
        let outputObj: Record<string, unknown> | null = null
        
        if (typeof result.output_data === 'string') {
          // Try to parse as JSON and spread fields
          try {
            const parsed = JSON.parse(result.output_data)
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              outputObj = parsed
            } else {
              // Not an object, use as single Output column (fallback)
              flat.Output = String(parsed)
            }
          } catch {
            // Not JSON, check if it's a plain string that should be in Output column
            // But first, try stripping markdown code blocks
            const cleaned = result.output_data.trim()
            const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/m)
            if (codeBlockMatch) {
              try {
                const parsed = JSON.parse(codeBlockMatch[1].trim())
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                  outputObj = parsed
                } else {
                  flat.Output = String(parsed)
                }
              } catch {
                flat.Output = result.output_data
              }
            } else {
              flat.Output = result.output_data
            }
          }
        } else if (typeof result.output_data === 'object' && result.output_data !== null) {
          // Already an object, use it directly
          outputObj = result.output_data as Record<string, unknown>
        }
        
        // Spread object fields as separate columns (each output field = one column)
        if (outputObj) {
          Object.entries(outputObj).forEach(([key, value]) => {
            // Use the key as-is (e.g., "summary", "skills", etc.)
            // Convert non-string values to strings for CSV compatibility
            // For arrays/objects, stringify; for primitives, convert to string
            if (value === null || value === undefined) {
              flat[key] = ''
            } else if (typeof value === 'string') {
              flat[key] = value
            } else if (typeof value === 'object') {
              // Arrays or nested objects - stringify
              flat[key] = JSON.stringify(value)
            } else {
              // Numbers, booleans, etc. - convert to string
              flat[key] = String(value)
            }
          })
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

