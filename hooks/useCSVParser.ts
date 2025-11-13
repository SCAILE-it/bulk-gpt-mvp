/**
 * V2 Hook: CSV Parser with State Management
 * 
 * Wraps the csv-parser utility with React state for component use
 * Handles parsing state, errors, and provides parsed data
 * 
 * @example
 * const { parseFile, csvData, isParsing, error } = useCSVParser()
 * 
 * await parseFile(file)
 * console.log(csvData) // ParsedCSV object
 */

import { useState, useCallback } from 'react'
import { parseCSV } from '@/lib/csv-parser'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { ParsedCSV } from '@/lib/types'

export interface UseCSVParserReturn {
  csvData: ParsedCSV | null
  isParsing: boolean
  error: string | null
  
  parseFile: (file: File) => Promise<ParsedCSV | null>
  setParsedData: (data: ParsedCSV) => void
  clearData: () => void
  clearError: () => void
}

/**
 * Custom hook for CSV parsing with state management
 * Separates parsing logic from component rendering
 */
export function useCSVParser(): UseCSVParserReturn {
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Parse a CSV file and update state
   * Returns parsed data or null on error
   */
  const parseFile = useCallback(async (file: File): Promise<ParsedCSV | null> => {
    setIsParsing(true)
    setError(null)

    try {
      // Use the existing csv-parser utility
      const parsed = await parseCSV(file)
      
      // Update state
      setCsvData(parsed)
      
      // Track successful parse
      trackEvent(ANALYTICS_EVENTS.FILE_UPLOADED, {
        fileName: file.name,
        fileSize: file.size,
        rowCount: parsed.totalRows,
        columnCount: parsed.columns.length,
      })
      
      return parsed
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse CSV'
      setError(errorMessage)
      setCsvData(null)
      
      // Track parse error
      trackEvent(ANALYTICS_EVENTS.FILE_PARSE_ERROR, {
        fileName: file.name,
        fileSize: file.size,
        error: errorMessage,
        stage: 'parsing',
      })
      
      return null
      
    } finally {
      setIsParsing(false)
    }
  }, [])

  /**
   * Set parsed data directly (useful for Google Sheets integration)
   */
  const setParsedData = useCallback((data: ParsedCSV) => {
    setCsvData(data)
    setError(null)
  }, [])

  /**
   * Clear parsed data
   */
  const clearData = useCallback(() => {
    setCsvData(null)
    setError(null)
  }, [])

  /**
   * Clear error only
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    csvData,
    isParsing,
    error,
    parseFile,
    setParsedData,
    clearData,
    clearError,
  }
}
