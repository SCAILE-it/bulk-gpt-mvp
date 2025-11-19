/**
 * V2 Hook: Batch Processing with Real-time Streaming
 * 
 * Handles batch job creation, real-time result streaming via EventSource,
 * and result state management. Most complex hook due to async operations.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { ParsedCSV } from '@/lib/types'

export interface BatchResult {
  id: string
  input: Record<string, string>
  output: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  retryCount?: number // Track retry attempts
}

export interface BatchProgress {
  completed: number
  total: number
  percentage: number
}

export interface StartBatchParams {
  csvData: ParsedCSV
  prompt: string
  context?: string
  outputColumns: string[]
  tools?: string[]
  webhookUrl?: string
  testMode?: boolean // Optional flag for test batches (single row)
  selectedInputColumns?: string[] // Input columns to include in output
}

export interface UseBatchProcessorReturn {
  batchId: string | null
  isProcessing: boolean
  results: BatchResult[]
  progress: BatchProgress | null
  error: string | null
  
  startBatch: (params: StartBatchParams) => Promise<void>
  cancelBatch: () => void
  clearResults: () => void
}

const BATCH_ID_STORAGE_KEY = 'bulk-gpt-current-batch-id'

export function useBatchProcessor(): UseBatchProcessorReturn {
  // Restore batchId from sessionStorage on mount (survives page refresh)
  const [batchId, setBatchId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return sessionStorage.getItem(BATCH_ID_STORAGE_KEY) || null
    } catch {
      return null
    }
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<BatchResult[]>([])
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  // CRITICAL FIX: Track all timers to prevent memory leaks from accumulating intervals
  const cleanupRefsRef = useRef<Array<() => void>>([])

  // Helper to register cleanup functions
  const registerCleanup = (cleanup: () => void) => {
    cleanupRefsRef.current.push(cleanup)
  }

  // Helper to run all cleanups
  const runAllCleanups = () => {
    cleanupRefsRef.current.forEach(cleanup => {
      try {
        cleanup()
      } catch (err) {
        console.error('Error during cleanup:', err)
      }
    })
    cleanupRefsRef.current = []
  }

  // Persist batchId to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (batchId) {
        sessionStorage.setItem(BATCH_ID_STORAGE_KEY, batchId)
      } else {
        sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
      }
    } catch (err) {
      console.debug('Failed to persist batchId:', err)
    }
  }, [batchId])

  // On mount, if batchId exists, check batch status and restore results
  // This runs once on mount to restore state from sessionStorage
  useEffect(() => {
    if (!batchId) return
    
    let isMounted = true
    
    const restoreBatchState = async () => {
      try {
        const response = await fetch(`/api/batch/${batchId}-status/status`)
        if (!response.ok || !isMounted) return

        const data = await response.json()
        const { status, processedRows, totalRows, results: dbResults } = data

        if (!isMounted) return

        // Determine if batch is still processing
        const isStillProcessing = status === 'processing' || status === 'pending'
        setIsProcessing(isStillProcessing)

        // Load results if available
        if (dbResults && Array.isArray(dbResults) && dbResults.length > 0) {
          setResults(dbResults.map((r: any) => ({
            id: r.id || `${batchId}-${dbResults.indexOf(r)}`,
            input: r.input || {},
            output: r.output || '',
            status: r.status === 'success' ? 'completed' : r.status === 'error' ? 'failed' : 'pending',
            error: r.error,
          })))
        }

        // Update progress if available
        const total = totalRows || 0
        const processed = processedRows || 0
        if (total > 0) {
          setProgress({
            completed: processed,
            total: total,
            percentage: Math.round((processed / total) * 100),
          })
        }
      } catch (err) {
        if (isMounted) {
          console.debug('Failed to restore batch state:', err)
        }
      }
    }

    restoreBatchState()
    
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  const startBatch = useCallback(async (params: StartBatchParams): Promise<void> => {
    const { csvData, prompt, context = '', outputColumns, webhookUrl, tools, testMode = false, selectedInputColumns } = params

    setIsProcessing(true)
    setError(null)
    setResults([])
    setProgress(null)

    try {
      // Filter rows to only include selected input columns (if specified)
      // If not specified, include all columns (backward compatibility)
      const filteredRows = selectedInputColumns && selectedInputColumns.length > 0
        ? csvData.rows.map(row => {
            const filteredData: Record<string, string> = {}
            selectedInputColumns.forEach(col => {
              if (col in row.data) {
                filteredData[col] = row.data[col]
              }
            })
            return filteredData
          })
        : csvData.rows.map(r => r.data)

      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvFilename: csvData.filename,
          rows: filteredRows,
          prompt,
          context,
          outputColumns,
          tools: tools || undefined,
          webhookUrl: webhookUrl || undefined,
          testMode: testMode || undefined,
          selectedInputColumns: selectedInputColumns || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Processing failed')
      }

      const data = await response.json()
      setBatchId(data.batchId)

      trackEvent(ANALYTICS_EVENTS.BATCH_STARTED, {
        batchId: data.batchId,
        rowCount: csvData.rows.length,
        promptLength: prompt.length,
        outputFieldCount: outputColumns.length,
        testMode,
      })

      // Create initial results with filtered input columns (matches what was sent to API)
      const initialResults: BatchResult[] = filteredRows.map((filteredData, index) => ({
        id: data.batchId + '-' + index,
        input: filteredData, // Use filtered data (only selected columns)
        output: '',
        status: 'pending' as const,
      }))
      setResults(initialResults)

      setProgress({
        completed: 0,
        total: csvData.rows.length,
        percentage: 0,
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed'
      setError(errorMessage)
      setIsProcessing(false)
      
      trackEvent(ANALYTICS_EVENTS.BATCH_FAILED, {
        error: errorMessage,
      })
    }
  }, [])

  const cancelBatch = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsProcessing(false)
    setBatchId(null)
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setProgress(null)
    setError(null)
    setBatchId(null) // Clear batchId and sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(BATCH_ID_STORAGE_KEY)
      } catch {
        // Ignore
      }
    }
  }, [])

  useEffect(() => {
    if (!batchId) return

    // CRITICAL FIX: Run all previous cleanups at the start to prevent interval accumulation
    runAllCleanups()

    // If not processing, just fetch results once (for completed batches)
    if (!isProcessing) {
      const fetchCompletedResults = async () => {
        try {
          const response = await fetch(`/api/batch/${batchId}-status/status`)
          if (!response.ok) return

          const data = await response.json()
          const { results: dbResults, processedRows, totalRows } = data

          // Load results if available
          if (dbResults && Array.isArray(dbResults) && dbResults.length > 0) {
            setResults(dbResults.map((r: any) => ({
              id: r.id || `${batchId}-${dbResults.indexOf(r)}`,
              input: r.input || {},
              output: r.output || '',
              status: r.status === 'success' ? 'completed' : r.status === 'error' ? 'failed' : 'pending',
              error: r.error,
            })))
          }

          // Update progress if available
          const total = totalRows || 0
          const processed = processedRows || 0
          if (total > 0) {
            setProgress({
              completed: processed,
              total: total,
              percentage: Math.round((processed / total) * 100),
            })
          }
        } catch (err) {
          console.debug('Failed to fetch completed batch results:', err)
        }
      }

      fetchCompletedResults()
      return
    }

    // If processing, set up EventSource streaming
    const eventSource = new EventSource('/api/batch/' + batchId + '/stream')
    eventSourceRef.current = eventSource

    let pollInterval: NodeJS.Timeout | null = null
    let lastProgressCheck = Date.now()
    const POLL_INTERVAL_MS = 2000 // Poll every 2 seconds as fallback (more aggressive)
    const STREAM_TIMEOUT_MS = 10000 // If no stream updates for 10s, start polling (faster fallback)

    // Fallback polling function to check batch status directly
    const pollBatchStatus = async () => {
      try {
        const response = await fetch(`/api/batch/${batchId}-status/status`)
        if (!response.ok) return

        const data = await response.json()
        const { status, processedRows, totalRows, results: dbResults } = data

        // Update progress from database
        const total = totalRows || 0
        const processed = processedRows || 0
        if (total > 0) {
          setProgress({
            completed: processed,
            total: total,
            percentage: Math.round((processed / total) * 100),
          })
        }

        // Update results from database if available
        if (dbResults && Array.isArray(dbResults) && dbResults.length > 0) {
          setResults(prev => {
            // Merge database results with existing results
            const updated = [...prev]
            dbResults.forEach((dbResult: any) => {
              // Find matching result by input data or create new entry
              const existingIndex = updated.findIndex(r => {
                // Try to match by comparing input data
                const inputMatch = JSON.stringify(r.input) === JSON.stringify(dbResult.input || {})
                return inputMatch
              })
              
              if (existingIndex >= 0) {
                updated[existingIndex] = {
                  id: dbResult.id || updated[existingIndex].id,
                  input: dbResult.input || updated[existingIndex].input,
                  output: dbResult.output || updated[existingIndex].output,
                  status: dbResult.status === 'success' ? 'completed' : dbResult.status === 'error' ? 'failed' : updated[existingIndex].status,
                  error: dbResult.error || updated[existingIndex].error,
                }
              } else {
                // Add new result if not found
                updated.push({
                  id: dbResult.id || `${batchId}-${updated.length}`,
                  input: dbResult.input || {},
                  output: dbResult.output || '',
                  status: dbResult.status === 'success' ? 'completed' : dbResult.status === 'error' ? 'failed' : 'pending',
                  error: dbResult.error,
                })
              }
            })
            
            // Update progress based on actual results (real-time progress)
            const completed = updated.filter(r => r.status === 'completed' || r.status === 'failed').length
            const total = updated.length || totalRows || 0
            if (total > 0) {
              setProgress({
                completed,
                total,
                percentage: Math.round((completed / total) * 100),
              })
            }
            
            return updated
          })
        }

        // Check if batch is complete
        if (status === 'completed' || status === 'completed_with_errors' || status === 'failed') {
          setIsProcessing(false)
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }

          // Fetch final results from database if not already loaded
          if (dbResults && Array.isArray(dbResults) && dbResults.length > 0) {
            // Results already updated above
          } else {
            // Fetch results directly from database
            try {
              const resultsResponse = await fetch(`/api/batch/${batchId}-status/status`)
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json()
                if (resultsData.results && Array.isArray(resultsData.results)) {
                  setResults(resultsData.results.map((r: any) => ({
                    id: r.id,
                    input: r.input || {},
                    output: r.output || '',
                    status: r.status === 'success' ? 'completed' : r.status === 'error' ? 'failed' : 'pending',
                    error: r.error,
                  })))
                }
              }
            } catch (fetchErr) {
              console.debug('Failed to fetch final results:', fetchErr)
            }
          }

          if (status === 'completed' || status === 'completed_with_errors') {
            trackEvent(ANALYTICS_EVENTS.BATCH_COMPLETED, {
              batchId,
              status,
            })
          }
        }
      } catch (err) {
        // Silently fail polling - EventSource is primary mechanism
        console.debug('Polling batch status failed:', err)
      }
    }

    eventSource.addEventListener('result', (e) => {
      lastProgressCheck = Date.now()
      try {
        const result = JSON.parse(e.data)
        setResults(prev => {
          const updated = [...prev]
          const index = result.row_index
          if (index >= 0 && index < updated.length) {
            let inputData = result.input_data
            if (typeof inputData === 'string') {
              try {
                inputData = JSON.parse(inputData)
              } catch (parseError) {
                console.error('Failed to parse input_data in result event:', parseError)
                inputData = {}
              }
            }
            updated[index] = {
              id: result.id,
              input: inputData,
              output: result.output_data || '',
              status: result.status === 'success'
                ? 'completed'
                : result.status === 'error'
                ? 'failed'
                : result.status,
              error: result.error_message,
            }
          }

          // Update progress based on actual results (real-time progress)
          const completed = updated.filter(r => r.status === 'completed' || r.status === 'failed').length
          const total = updated.length
          if (total > 0) {
            setProgress({
              completed,
              total,
              percentage: Math.round((completed / total) * 100),
            })
          }

          return updated
        })
      } catch (parseError) {
        console.error('Failed to parse result event data:', parseError)
      }
    })

    eventSource.addEventListener('progress', (e) => {
      lastProgressCheck = Date.now()
      try {
        const { completed, total } = JSON.parse(e.data)
        setProgress({
          completed,
          total,
          percentage: Math.round((completed / total) * 100),
        })
      } catch (parseError) {
        console.error('Failed to parse progress event data:', parseError)
      }
    })

    eventSource.addEventListener('complete', (e) => {
      try {
        const { status } = JSON.parse(e.data)
        setIsProcessing(false)
        eventSource.close()
        eventSourceRef.current = null
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }

        if (status === 'completed' || status === 'completed_with_errors') {
          trackEvent(ANALYTICS_EVENTS.BATCH_COMPLETED, {
            batchId,
            status,
          })
        }
      } catch (parseError) {
        console.error('Failed to parse complete event data:', parseError)
        // Still close the connection on parse error
        setIsProcessing(false)
        eventSource.close()
        eventSourceRef.current = null
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
      }
    })

    eventSource.addEventListener('error', () => {
      // Don't immediately fail - start polling as fallback
      console.debug('EventSource error, starting fallback polling')
      if (!pollInterval) {
        // Start polling immediately if stream fails
        pollInterval = setInterval(pollBatchStatus, POLL_INTERVAL_MS)
        pollBatchStatus() // Check immediately
      }
    })

    // Start fallback polling after stream timeout
    const streamTimeout = setTimeout(() => {
      if (isProcessing && !pollInterval) {
        console.debug('Stream timeout, starting fallback polling')
        pollInterval = setInterval(pollBatchStatus, POLL_INTERVAL_MS)
        pollBatchStatus() // Check immediately
      }
    }, STREAM_TIMEOUT_MS)
    registerCleanup(() => clearTimeout(streamTimeout))

    // Also poll periodically as backup (same frequency as fallback)
    const backupPollInterval = setInterval(() => {
      // Only poll if no recent stream activity
      if (Date.now() - lastProgressCheck > STREAM_TIMEOUT_MS) {
        pollBatchStatus()
      }
    }, POLL_INTERVAL_MS) // Every 2 seconds (same as fallback)
    registerCleanup(() => clearInterval(backupPollInterval))

    return () => {
      // Clean up EventSource
      try {
        eventSource.close()
      } catch {
        // EventSource might already be closed
      }
      eventSourceRef.current = null

      // Clean up polling interval if it exists
      if (pollInterval) {
        clearInterval(pollInterval)
      }

      // Clean up all registered timers/intervals
      runAllCleanups()
    }
  }, [batchId, isProcessing])

  return {
    batchId,
    isProcessing,
    results,
    progress,
    error,
    startBatch,
    cancelBatch,
    clearResults,
  }
}
