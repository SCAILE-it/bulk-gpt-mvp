/**
 * V2 Hook: CSV Parser
 * 
 * Extracted from BulkProcessor.tsx to follow Single Responsibility Principle
 * Handles CSV parsing with validation and type safety
 * 
 * @example
 * const { csvData, parseFile, isParsing, error } = useCSVParser()
 * await parseFile(file)
 */

import { useState, useCallback } from 'react'
import { parseCSV } from '@/lib/csv-parser'
import type { ParsedCSV } from '@/lib/types'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

export interface UseCSVParserReturn {
  csvData: ParsedCSV | null
  isParsing: boolean
  error: string | null
  
  parseFile: (file: File) => Promise<void>
  clearData: () => void
  clearError: () => void
}

/**
 * Custom hook for parsing CSV files with error handling
 */
export function useCSVParser(): UseCSVParserReturn {
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseFile = useCallback(async (file: File): Promise<void> => {
    setIsParsing(true)
    setError(null)

    try {
      const parsed = await parseCSV(file)
      setCsvData(parsed)

      // Track successful parse with metadata
      trackEvent(ANALYTICS_EVENTS.FILE_UPLOADED, {
        fileName: file.name,
        fileSize: file.size,
        rowCount: parsed.totalRows,
        columnCount: parsed.columns.length,
      })
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
      
      throw err // Re-throw so caller can handle
    } finally {
      setIsParsing(false)
    }
  }, [])

  const clearData = useCallback(() => {
    setCsvData(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    csvData,
    isParsing,
    error,
    parseFile,
    clearData,
    clearError,
  }
}
