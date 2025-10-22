/**
 * V2 Service: Batch Processing API
 * 
 * Centralized service for all batch processing API calls
 * Follows Single Responsibility - handles only API communication
 * 
 * @example
 * const service = new BatchProcessingService()
 * const batchId = await service.startBatch({ csvFilename, rows, prompt, outputColumns })
 * const results = await service.getBatchResults(batchId)
 */

import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

export interface BatchStartRequest {
  csvFilename: string
  rows: Record<string, string>[]
  prompt: string
  context?: string
  outputColumns: string[]
  webhookUrl?: string
}

export interface BatchStartResponse {
  batchId: string
  status: string
  message?: string
}

export interface BatchStatusResponse {
  batchId: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  totalRows: number
  processedRows: number
  error?: string
}

export interface BatchResult {
  id: string
  batchId: string
  rowIndex: number
  input: Record<string, string>
  output: Record<string, string>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  createdAt: string
  processedAt?: string
}

export interface BatchResultsResponse {
  results: BatchResult[]
  total: number
  page: number
  pageSize: number
}

/**
 * Service for batch processing operations
 */
export class BatchProcessingService {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  /**
   * Start a new batch processing job
   */
  async startBatch(request: BatchStartRequest): Promise<BatchStartResponse> {
    try {
      // Track batch initiation
      trackEvent(ANALYTICS_EVENTS.BATCH_STARTED, {
        rowCount: request.rows.length,
        promptLength: request.prompt.length,
        outputFieldCount: request.outputColumns.length,
        hasWebhook: !!request.webhookUrl,
      })

      const response = await fetch(`${this.baseUrl}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Track successful start
      trackEvent(ANALYTICS_EVENTS.BATCH_STARTED, {
        batchId: data.batchId,
        rowCount: request.rows.length,
      })

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start batch'
      
      // Track error
      trackEvent(ANALYTICS_EVENTS.BATCH_ERROR, {
        error: errorMessage,
        stage: 'start',
      })
      
      throw new Error(`Failed to start batch: ${errorMessage}`)
    }
  }

  /**
   * Test batch processing with a single row
   */
  async testBatch(request: Omit<BatchStartRequest, 'rows'> & { row: Record<string, string> }): Promise<BatchStartResponse> {
    const { row, ...rest } = request
    return this.startBatch({
      ...rest,
      rows: [row],
    })
  }

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/${batchId}/status`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get batch status'
      throw new Error(`Failed to get batch status: ${errorMessage}`)
    }
  }

  /**
   * Get batch results
   */
  async getBatchResults(
    batchId: string,
    page: number = 1,
    pageSize: number = 100
  ): Promise<BatchResultsResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/batch/${batchId}/results?page=${page}&pageSize=${pageSize}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get batch results'
      throw new Error(`Failed to get batch results: ${errorMessage}`)
    }
  }

  /**
   * Cancel a running batch
   */
  async cancelBatch(batchId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/${batchId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Track cancellation
      trackEvent(ANALYTICS_EVENTS.BATCH_CANCELLED, {
        batchId,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel batch'
      throw new Error(`Failed to cancel batch: ${errorMessage}`)
    }
  }

  /**
   * Create SSE connection for real-time batch progress
   */
  createProgressStream(batchId: string): EventSource {
    return new EventSource(`${this.baseUrl}/batch/${batchId}/stream`)
  }

  /**
   * Export batch results as CSV
   */
  async exportResults(
    batchId: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    try {
      const response = await fetch(
        `${this.baseUrl}/batch/${batchId}/export?format=${format}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Track export
      trackEvent(ANALYTICS_EVENTS.RESULTS_EXPORTED, {
        batchId,
        format,
      })

      return await response.blob()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export results'
      throw new Error(`Failed to export results: ${errorMessage}`)
    }
  }
}

// Singleton instance for easy access
export const batchService = new BatchProcessingService()

// Export for dependency injection / testing
export default BatchProcessingService
