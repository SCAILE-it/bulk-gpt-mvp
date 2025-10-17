/**
 * Retry logic with exponential backoff and circuit breaker
 */

import { BulkGPTError } from './types'

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  onRetry?: (delay: number, attempt: number, error: Error) => void
}

/**
 * Retry an async function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay)
        const jitter = Math.random() * delay * 0.1 // 10% jitter
        const totalDelay = Math.floor(delay + jitter)

        onRetry?.(totalDelay, attempt + 1, lastError)

        await new Promise((resolve) => setTimeout(resolve, totalDelay))
      }
    }
  }

  throw lastError || new Error('Retry exhausted')
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number = 30000,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new BulkGPTError('TIMEOUT', `Request timeout after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker<T = unknown> {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: number | null = null
  private readonly threshold: number
  private readonly timeout: number

  constructor(
    private fn: () => Promise<T>,
    options: { threshold?: number; timeout?: number } = {}
  ) {
    this.threshold = options.threshold || 5
    this.timeout = options.timeout || 60000 // 60 seconds default
  }

  async execute(): Promise<T> {
    if (this.state === 'open') {
      // Check if timeout has passed
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.timeout
      ) {
        this.state = 'half-open'
        this.successCount = 0
      } else {
        throw new BulkGPTError(
          'CIRCUIT_BREAKER_OPEN',
          'Circuit breaker is open'
        )
      }
    }

    try {
      const result = await this.fn()

      if (this.state === 'half-open') {
        this.successCount++
        if (this.successCount >= 2) {
          // Successful recovery
          this.state = 'closed'
          this.failureCount = 0
        }
      } else {
        // Reset on success
        this.failureCount = 0
      }

      return result
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.failureCount >= this.threshold) {
        this.state = 'open'
      }

      throw error
    }
  }

  isOpen(): boolean {
    return this.state === 'open'
  }

  isClosed(): boolean {
    return this.state === 'closed'
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state
  }

  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
  }
}






