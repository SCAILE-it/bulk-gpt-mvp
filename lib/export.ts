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
  metadata?: ExportMetadata
): string {
  if (!Array.isArray(data)) {
    throw new TypeError('Data must be an array')
  }

  if (data.length === 0) {
    return ''
  }

  let csv = Papa.unparse(data, {
    header: true,
    skipEmptyLines: true,
  })

  // Prepend metadata as comments if provided
  if (metadata) {
    const comments: string[] = []
    if (metadata.batchId) {
      comments.push(`# Batch ID: ${metadata.batchId}`)
    }
    if (metadata.timestamp) {
      comments.push(`# Exported at: ${metadata.timestamp}`)
    }
    // Add any other metadata fields
    for (const [key, value] of Object.entries(metadata)) {
      if (key !== 'batchId' && key !== 'timestamp') {
        comments.push(`# ${key}: ${value}`)
      }
    }
    if (comments.length > 0) {
      csv = comments.join('\n') + '\n' + csv
    }
  }

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

