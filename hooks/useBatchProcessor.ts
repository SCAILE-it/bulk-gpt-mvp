/**
 * V2 Hook: Batch Processor
 * 
 * Manages batch processing lifecycle: start, monitor, results
 * Uses BatchProcessingService for API calls
 * Handles state management and real-time updates via SSE
 * 
 * @example
 * const { startBatch, results, isProcessing, progress } = useBatchProcessor()
 * await startBatch({ rows, prompt, outputColumns })
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { batchService, type BatchStartRequest, type BatchResult } from '@/services/batchProcessingService'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

export interface BatchProgress {
  batchId: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  totalRows: number
  processedRows: number
  percentage: number
  error?: string
}

export interface UseBatchProcessorReturn {
  // State
  batchId: string | null
  results: BatchResult[]
  isProcessing: boolean
  isTesting: boolean
  progress: BatchProgress | null
  error: string | null
  
  // Actions
  startBatch: (request: BatchStartRequest) => Promise<void>
  testBatch: (request: Omit<BatchStartRequest, 'rows'> & { rows: Record<string, string>[] }) => Promise<void>
  cancelBatch: () => Promise<void>
  exportResults: (format?: 'csv' | 'json') => Promise<void>
  clearResults: () => void
  clearError: () => void
}

/**
 * Custom hook for batch processing operations
 */
export function useBatchProcessor(): UseBatchProcessorReturn {
  const [batchId, setBatchId] = useState<string | null>(null)
  const [results, setResults] = useState<BatchResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  // Set up SSE streaming for batch progress
  useEffect(() => {
    if (!batchId || !isProcessing) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    // Create SSE connection
    const eventSource = batchService.createProgressStream(batchId)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Update progress
        if (data.type === 'progress') {
          setProgress({
            batchId: data.batchId,
            status: data.status,
            totalRows: data.totalRows,
            processedRows: data.processedRows,
            percentage: Math.round((data.processedRows / data.totalRows) * 100),
          })
        }

        // Update individual result
        if (data.type === 'result') {
          setResults((prev) => {
            const index = prev.findIndex((r) => r.rowIndex === data.result.rowIndex)
            if (index >= 0) {
              const updated = [...prev]
              updated[index] = data.result
              return updated
            }
            return [...prev, data.result]
          })
        }

        // Batch completed
        if (data.type === 'complete') {
          setIsProcessing(false)
          setProgress((prev) => prev ? { ...prev, status: data.status } : null)
          
          // Track completion
          trackEvent(ANALYTICS_EVENTS.BATCH_COMPLETED, {
            batchId: data.batchId,
            status: data.status,
            totalRows: data.totalRows,
            processedRows: data.processedRows,
          })

          // Close connection
          eventSource.close()
          eventSourceRef.current = null
        }

        // Error occurred
        if (data.type === 'error') {
          setError(data.error)
          setIsProcessing(false)
          
          trackEvent(ANALYTICS_EVENTS.BATCH_FAILED, {
            batchId: data.batchId,
            error: data.error,
          })

          eventSource.close()
          eventSourceRef.current = null
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to parse SSE message:', err)
        }
      }
    }

    eventSource.onerror = () => {
      setError('Lost connection to server')
      setIsProcessing(false)
      eventSource.close()
      eventSourceRef.current = null
    }

    return () => {
      eventSource.close()
    }
  }, [batchId, isProcessing])

  const startBatch = useCallback(async (request: BatchStartRequest): Promise<void> => {
    setIsProcessing(true)
    setError(null)
    setResults([])
    setProgress(null)

    try {
      const response = await batchService.startBatch(request)
      setBatchId(response.batchId)

      // Initialize results with pending status
      const initialResults: BatchResult[] = request.rows.map((row, index) => ({
        id: `${response.batchId}-${index}`,
        batchId: response.batchId,
        rowIndex: index,
        input: row,
        output: {},
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      }))
      setResults(initialResults)

      // Initialize progress
      setProgress({
        batchId: response.batchId,
        status: 'pending',
        totalRows: request.rows.length,
        processedRows: 0,
        percentage: 0,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start batch'
      setError(errorMessage)
      setIsProcessing(false)
      
      trackEvent(ANALYTICS_EVENTS.BATCH_ERROR, {
        error: errorMessage,
        stage: 'start',
      })
    }
  }, [])

  const testBatch = useCallback(async (
    request: Omit<BatchStartRequest, 'rows'> & { rows: Record<string, string>[] }
  ): Promise<void> => {
    if (request.rows.length === 0) {
      setError('No rows to test')
      return
    }

    setIsTesting(true)
    setError(null)

    try {
      // Test with first row only
      const testRequest: BatchStartRequest = {
        ...request,
        rows: [request.rows[0]],
      }

      const response = await batchService.startBatch(testRequest)
      
      // Track test
      trackEvent(ANALYTICS_EVENTS.BATCH_STARTED, {
        batchId: response.batchId,
        isTest: true,
        rowCount: 1,
      })

      alert(`Test successful! Batch ${response.batchId} started. Check results below.`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Test failed'
      setError(errorMessage)
      
      trackEvent(ANALYTICS_EVENTS.BATCH_ERROR, {
        error: errorMessage,
        stage: 'test',
      })
    } finally {
      setIsTesting(false)
    }
  }, [])

  const cancelBatch = useCallback(async (): Promise<void> => {
    if (!batchId) return

    try {
      await batchService.cancelBatch(batchId)
      setIsProcessing(false)
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel batch'
      setError(errorMessage)
    }
  }, [batchId])

  const exportResults = useCallback(async (format: 'csv' | 'json' = 'csv'): Promise<void> => {
    if (!batchId) {
      setError('No batch to export')
      return
    }

    try {
      const blob = await batchService.exportResults(batchId, format)
      
      // Download file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch-${batchId}-results.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export results'
      setError(errorMessage)
    }
  }, [batchId])

  const clearResults = useCallback(() => {
    setResults([])
    setBatchId(null)
    setProgress(null)
    setError(null)
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    batchId,
    results,
    isProcessing,
    isTesting,
    progress,
    error,
    startBatch,
    testBatch,
    cancelBatch,
    exportResults,
    clearResults,
    clearError,
  }
}
