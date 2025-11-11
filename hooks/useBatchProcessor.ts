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

export function useBatchProcessor(): UseBatchProcessorReturn {
  const [batchId, setBatchId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<BatchResult[]>([])
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)

  const startBatch = useCallback(async (params: StartBatchParams): Promise<void> => {
    const { csvData, prompt, context = '', outputColumns, webhookUrl, tools } = params

    setIsProcessing(true)
    setError(null)
    setResults([])
    setProgress(null)

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvFilename: csvData.filename,
          rows: csvData.rows.map(r => r.data),
          prompt,
          context,
          outputColumns,
          tools: tools || undefined,
          webhookUrl: webhookUrl || undefined,
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
      })

      const initialResults: BatchResult[] = csvData.rows.map((row, index) => ({
        id: data.batchId + '-' + index,
        input: row.data,
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
    setBatchId(null)
  }, [])

  useEffect(() => {
    if (!batchId || !isProcessing) return

    const eventSource = new EventSource('/api/batch/' + batchId + '/stream')
    eventSourceRef.current = eventSource

    eventSource.addEventListener('result', (e) => {
      const result = JSON.parse(e.data)
      setResults(prev => {
        const updated = [...prev]
        const index = result.row_index
        if (index >= 0 && index < updated.length) {
          updated[index] = {
            id: result.id,
            input: typeof result.input_data === 'string' 
              ? JSON.parse(result.input_data) 
              : result.input_data,
            output: result.output_data || '',
            status: result.status === 'success' 
              ? 'completed' 
              : result.status === 'error' 
              ? 'failed' 
              : result.status,
            error: result.error_message,
          }
        }
        return updated
      })
    })

    eventSource.addEventListener('progress', (e) => {
      const { completed, total } = JSON.parse(e.data)
      setProgress({
        completed,
        total,
        percentage: Math.round((completed / total) * 100),
      })
    })

    eventSource.addEventListener('complete', (e) => {
      const { status } = JSON.parse(e.data)
      setIsProcessing(false)
      eventSource.close()
      eventSourceRef.current = null
      
      if (status === 'completed' || status === 'completed_with_errors') {
        trackEvent(ANALYTICS_EVENTS.BATCH_COMPLETED, {
          batchId,
          status,
        })
      }
    })

    eventSource.addEventListener('error', () => {
      setError('Stream connection failed')
      setIsProcessing(false)
      eventSource.close()
      eventSourceRef.current = null
    })

    return () => {
      eventSource.close()
      eventSourceRef.current = null
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
