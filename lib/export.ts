import Papa from 'papaparse'

/**
 * Export utilities for converting data to various formats
 * Follows production-grade patterns with proper type safety
 */

export interface ExportOptions {
  filename?: string
  includeHeaders?: boolean
}

export interface ExportMetadata {
  batchId?: string
  timestamp?: string
  [key: string]: unknown
}

/**
 * Convert array of objects to CSV format
 * Uses papaparse for reliable CSV generation
 * Optionally includes metadata as CSV comments
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata?: ExportMetadata
): string {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }

  if (data.length === 0) {
    return ''
  }

  // Generate CSV without metadata comments
  // Metadata is included in the filename instead
  const csv = Papa.unparse(data, {
    header: true,
    skipEmptyLines: true,
  })

  return csv
}

/**
 * Convert array of objects to JSON format
 * Returns structured object with results and optional metadata
 */
export function exportToJSON<T extends Record<string, unknown>>(
  data: T[],
  metadata?: ExportMetadata
): string {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }

  const output: {
    results: T[]
    metadata?: ExportMetadata
    exportedAt: string
  } = {
    results: data,
    exportedAt: new Date().toISOString(),
  }

  if (metadata) {
    output.metadata = metadata
  }

  return JSON.stringify(output, null, 2)
}

/**
 * Trigger browser download of content
 * Creates a blob and simulates click on download link
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  if (!content || typeof content !== 'string') {
    throw new TypeError('Content must be a non-empty string')
  }

  if (!filename || typeof filename !== 'string') {
    throw new TypeError('Filename must be a non-empty string')
  }

  // Ensure mimeType doesn't have trailing semicolon
  const cleanMimeType = mimeType.replace(/;+$/, '')
  const blob = new Blob([content], { type: cleanMimeType })
  const url = URL.createObjectURL(blob)

  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    // Always cleanup the object URL
    URL.revokeObjectURL(url)
  }
}

/**
 * Export and download data as CSV
 */
export function downloadCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  const csv = exportToCSV(data)
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

/**
 * Export and download data as JSON
 */
export function downloadJSON<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  const json = exportToJSON(data)
  downloadFile(json, filename, 'application/json;charset=utf-8;')
}

/**
 * Batch result structure from database/API
 */
export interface BatchResultRow {
  input_data: Record<string, unknown> | string
  output_data: Record<string, unknown> | string | null
  status: string
  error_message?: string | null
  input_tokens?: number | null
  output_tokens?: number | null
  model?: string | null
}

/**
 * Flattened result ready for CSV/JSON export
 * Single source of truth for export format - ensures RUN and EXECUTIONS exports are always aligned
 */
export interface FlattenedExportResult extends Record<string, unknown> {
  Status: string
  Error: string
  Input_Tokens: number
  Output_Tokens: number
  Model: string
}

/**
 * Flatten batch results for export
 * DRY function - single source of truth for export format
 * Ensures RUN page and EXECUTIONS page exports are always 100% aligned
 * 
 * @param results - Array of batch result rows from database/API
 * @returns Array of flattened records ready for CSV/JSON export
 */
export function flattenBatchResultsForExport(
  results: BatchResultRow[]
): FlattenedExportResult[] {
  return results.map((result) => {
    const flat: FlattenedExportResult = {
      Status: result.status || 'unknown',
      Error: result.error_message || '',
      Input_Tokens: result.input_tokens || 0,
      Output_Tokens: result.output_tokens || 0,
      Model: result.model || '',
    }

    // Parse and spread input fields
    if (result.input_data) {
      const inputData = typeof result.input_data === 'string'
        ? JSON.parse(result.input_data)
        : result.input_data
      
      if (typeof inputData === 'object' && inputData !== null) {
        Object.assign(flat, inputData)
      }
    }

    // Parse and spread output fields as separate columns
    // IMPORTANT: Each output field becomes its own column, not a single "AI_Output" column
    if (result.output_data) {
      let outputObj: Record<string, unknown> | null = null
      
      if (typeof result.output_data === 'string') {
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(result.output_data)
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            outputObj = parsed
          } else {
            // Not an object, use as single Output column (fallback)
            flat.Output = String(parsed)
          }
        } catch {
          // Not JSON, check if it's wrapped in markdown code blocks
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
          // Convert non-string values to strings for CSV compatibility
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

    return flat
  })
}

/**
 * Format results for email notification
 * Generates HTML table for email body
 */
export function formatForEmail<T extends Record<string, unknown>>(
  data: T[]
): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '<p>No results to display.</p>'
  }

  const columns = Object.keys(data[0])
  const rowCount = data.length
  
  let html = `<div style="font-family: Arial, sans-serif;">`
  html += `<p><strong>${rowCount} results</strong></p>`
  html += `<table style="border-collapse: collapse; width: 100%; max-width: 600px;">`
  
  // Header
  html += `<thead><tr style="background-color: #f3f4f6;">`
  columns.forEach(col => {
    html += `<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${col}</th>`
  })
  html += `</tr></thead>`
  
  // Rows (limit to first 10 for email)
  html += `<tbody>`
  data.slice(0, 10).forEach(row => {
    html += `<tr>`
    columns.forEach(col => {
      const value = row[col]
      html += `<td style="border: 1px solid #d1d5db; padding: 8px;">${value ?? '-'}</td>`
    })
    html += `</tr>`
  })
  html += `</tbody></table>`
  
  if (rowCount > 10) {
    html += `<p><em>Showing first 10 of ${rowCount} results</em></p>`
  }
  
  html += `</div>`
  return html
}

