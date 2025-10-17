import Papa from 'papaparse'
import { CSVRow, ParsedCSV, BulkGPTError } from './types'

/**
 * Parse CSV file and return typed result
 * Uses papaparse library for robust CSV handling
 */
export async function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      reject(
        new BulkGPTError(
          'INVALID_FILE_TYPE',
          'Only CSV files are supported',
          { filename: file.name }
        )
      )
      return
    }

    // Validate file size (50MB limit)
    const maxSizeBytes = 50 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      reject(
        new BulkGPTError(
          'FILE_TOO_LARGE',
          `File size must be less than 50MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          { fileSize: file.size, maxSize: maxSizeBytes }
        )
      )
      return
    }

    // Parse CSV with papaparse
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        try {
          // Check for parse errors
          if (result.errors.length > 0) {
            throw new BulkGPTError(
              'CSV_PARSE_ERROR',
              `Failed to parse CSV: ${result.errors[0].message}`,
              { errors: result.errors }
            )
          }

          // Validate we have data
          if (!result.data || result.data.length === 0) {
            throw new BulkGPTError(
              'EMPTY_CSV',
              'CSV file contains no data rows',
              { filename: file.name }
            )
          }

          // Get columns from first row
          const columns = Object.keys(result.data[0])
          if (columns.length === 0) {
            throw new BulkGPTError(
              'NO_COLUMNS',
              'CSV file has no columns',
              { filename: file.name }
            )
          }

          // Validate max columns (50 limit)
          if (columns.length > 50) {
            throw new BulkGPTError(
              'TOO_MANY_COLUMNS',
              `CSV has ${columns.length} columns. Maximum is 50.`,
              { columnCount: columns.length, maxColumns: 50 }
            )
          }

          // Validate max rows (10,000 limit)
          if (result.data.length > 10000) {
            throw new BulkGPTError(
              'TOO_MANY_ROWS',
              `CSV has ${result.data.length} rows. Maximum is 10,000.`,
              { rowCount: result.data.length, maxRows: 10000 }
            )
          }

          // Convert to CSVRow format
          const rows: CSVRow[] = result.data.map((row, index) => ({
            data: row,
            rowIndex: index,
          }))

          resolve({
            filename: file.name,
            rows,
            columns,
            totalRows: rows.length,
          })
        } catch (error) {
          if (error instanceof BulkGPTError) {
            reject(error)
          } else {
            reject(
              new BulkGPTError(
                'UNKNOWN_ERROR',
                error instanceof Error ? error.message : 'Unknown error parsing CSV'
              )
            )
          }
        }
      },
      error: (error) => {
        reject(
          new BulkGPTError(
            'CSV_READ_ERROR',
            `Failed to read CSV file: ${error.message}`,
            { error: error.message }
          )
        )
      },
    })
  })
}



