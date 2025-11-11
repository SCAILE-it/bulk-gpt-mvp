/**
 * ABOUTME: Generates realistic Modal V2 webhook payloads for testing
 * ABOUTME: Used by webhook handler unit tests to simulate Modal callbacks
 */

interface GeneratePayloadOptions {
  batchId?: string
  totalRows?: number
  successful?: number
  failed?: number
  status?: string
  includeErrors?: boolean
}

interface ModalV2Payload {
  batch_id: string
  total_rows: number
  successful: number
  failed: number
  processing_time_seconds: number
  avg_time_per_row: number
  status: string
  results: Array<{
    row_index: number
    input: Record<string, any>
    data: any
    status: string
    error: any
    processing_time_ms: number
  }>
}

/**
 * Generates a mock Modal V2 webhook payload
 *
 * @param options - Configuration options
 * @param options.batchId - Batch ID (defaults to test batch ID)
 * @param options.totalRows - Total number of rows processed (default: 3)
 * @param options.successful - Number of successful results (default: 3)
 * @param options.failed - Number of failed results (default: 0)
 * @param options.status - Batch status (default: 'completed')
 * @param options.includeErrors - Whether to include error results (default: false)
 * @returns Mock Modal V2 webhook payload
 */
export function generateModalV2Payload(options: GeneratePayloadOptions = {}): ModalV2Payload {
  const {
    batchId = `test_batch_${Date.now()}`,
    totalRows = 3,
    successful = 3,
    failed = 0,
    status = 'completed',
    includeErrors = false,
  } = options

  const results = []

  // Generate successful results
  for (let i = 0; i < successful; i++) {
    results.push({
      row_index: i,
      input: {
        name: `Test User ${i + 1}`,
        company: `Company ${i + 1}`,
      },
      data: {
        prompt_executor: {
          data: {
            output: {
              bio: `Professional bio for Test User ${i + 1} at Company ${i + 1}. This is a sample AI-generated biography that demonstrates the webhook handling logic.`,
            },
          },
        },
      },
      status: 'completed',
      error: null,
      processing_time_ms: 1200 + Math.random() * 800,
    })
  }

  // Generate failed results if needed
  for (let i = 0; i < failed; i++) {
    results.push({
      row_index: successful + i,
      input: {
        name: `Failed User ${i + 1}`,
        company: `Failed Company ${i + 1}`,
      },
      data: null,
      status: 'failed',
      error: {
        message: 'Test error: AI model timeout',
        type: 'TimeoutError',
      },
      processing_time_ms: 30000,
    })
  }

  const processingTime = results.reduce((sum, r) => sum + r.processing_time_ms, 0) / 1000
  const avgTimePerRow = processingTime / totalRows

  return {
    batch_id: batchId,
    total_rows: totalRows,
    successful,
    failed,
    processing_time_seconds: processingTime,
    avg_time_per_row: avgTimePerRow,
    status,
    results,
  }
}

/**
 * Generates a payload with errors
 */
export function generateErrorPayload(options: GeneratePayloadOptions = {}): ModalV2Payload {
  return generateModalV2Payload({
    ...options,
    successful: 2,
    failed: 1,
    status: 'completed_with_errors',
    includeErrors: true,
  })
}

/**
 * Generates a minimal test payload (single row)
 */
export function generateMinimalPayload(options: GeneratePayloadOptions = {}): ModalV2Payload {
  return generateModalV2Payload({
    ...options,
    totalRows: 1,
    successful: 1,
    failed: 0,
  })
}

/**
 * Generates a large batch payload (for stress testing)
 */
export function generateLargeBatchPayload(options: GeneratePayloadOptions = {}): ModalV2Payload {
  return generateModalV2Payload({
    ...options,
    totalRows: 50,
    successful: 48,
    failed: 2,
    status: 'completed_with_errors',
  })
}
