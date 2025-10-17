/**
 * Core type definitions for BULK-GPT MVP
 */

/**
 * Custom error class - re-exported from errors.ts for consistency
 */
export { BulkGPTError, type ErrorCode } from './errors'

/**
 * Individual CSV row with data and index
 */
export interface CSVRow {
  data: Record<string, string>
  rowIndex: number
}

/**
 * Parsed CSV file structure
 */
export interface ParsedCSV {
  filename: string
  rows: CSVRow[]
  columns: string[]
  totalRows: number
}

/**
 * Processing progress tracking
 */
export interface Progress {
  current: number
  total: number
  status?: 'idle' | 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  message?: string
}

/**
 * Output schema column definition
 */
export interface SchemaColumn {
  name: string
  type: string
  required: boolean
}

/**
 * Main application state
 */
export interface AppState {
  currentFile: ParsedCSV | null
  selectedTemplate: string | null
  prompt: string
  context: string
  outputColumns: string[]
  results: Array<{
    id: string
    input: Record<string, string> | string
    output: string
    status: 'pending' | 'processing' | 'success' | 'error'
    error?: string
  }>
  isProcessing: boolean
  progress: Progress
}
