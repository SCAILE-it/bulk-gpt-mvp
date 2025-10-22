/**
 * ABOUTME: Processing configuration constants for bulk operations
 * ABOUTME: Centralized config for parallel processing, retries, and rate limits
 */

/**
 * Number of concurrent workers for parallel processing
 * Matches Modal .starmap() configuration in modal-processor/main.py
 */
export const PARALLEL_CONCURRENCY = 10

/**
 * Maximum retry attempts per row
 * Matches tenacity configuration in modal-processor/main.py
 */
export const MAX_RETRY_ATTEMPTS = 3

/**
 * Retry backoff timing (in seconds)
 * Exponential backoff: 4s → 8s → 16s
 */
export const RETRY_BACKOFF = {
  initial: 4,
  multiplier: 2,
  max: 16,
} as const
