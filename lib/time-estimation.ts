/**
 * ABOUTME: Time estimation for batch processing operations
 * ABOUTME: Estimates processing time based on prompt length, tools, rows, and concurrency
 */

import { PARALLEL_CONCURRENCY } from './processing-constants'

/**
 * Base time per request in seconds (without tools, average prompt)
 * This is the typical time for a single AI API call
 */
const BASE_TIME_PER_REQUEST = 3.0 // seconds

/**
 * Time multiplier per tool (each tool adds overhead)
 * Tools require additional API calls and processing
 */
const TIME_PER_TOOL = 0.8 // seconds per tool

/**
 * Prompt length multipliers
 * Longer prompts take more time to process
 */
const PROMPT_LENGTH_MULTIPLIERS = {
  short: 0.8,   // < 100 chars
  medium: 1.0,  // 100-500 chars
  long: 1.3,    // 500-1000 chars
  veryLong: 1.6, // > 1000 chars
}

/**
 * Get prompt length category
 */
function getPromptLengthCategory(promptLength: number): keyof typeof PROMPT_LENGTH_MULTIPLIERS {
  if (promptLength < 100) return 'short'
  if (promptLength < 500) return 'medium'
  if (promptLength < 1000) return 'long'
  return 'veryLong'
}

/**
 * Estimate processing time for a batch operation
 * 
 * @param rowCount - Number of rows to process
 * @param promptLength - Length of the prompt in characters
 * @param toolCount - Number of tools selected
 * @param concurrency - Number of concurrent requests (default: PARALLEL_CONCURRENCY)
 * @returns Estimated time in seconds
 */
export function estimateProcessingTime(
  rowCount: number,
  promptLength: number,
  toolCount: number = 0,
  concurrency: number = PARALLEL_CONCURRENCY
): number {
  if (rowCount === 0) return 0

  // Base time per request
  let timePerRequest = BASE_TIME_PER_REQUEST

  // Add time for tools
  timePerRequest += toolCount * TIME_PER_TOOL

  // Apply prompt length multiplier
  const promptCategory = getPromptLengthCategory(promptLength)
  timePerRequest *= PROMPT_LENGTH_MULTIPLIERS[promptCategory]

  // Calculate total time considering concurrency
  // With concurrency, we process multiple rows simultaneously
  const batches = Math.ceil(rowCount / concurrency)
  const totalTime = batches * timePerRequest

  // Add overhead for batch management (5% overhead per batch)
  const overhead = batches * timePerRequest * 0.05

  return totalTime + overhead
}

/**
 * Format time estimate as human-readable string
 * 
 * @param seconds - Time in seconds
 * @returns Formatted string (e.g., "2 min", "30 sec", "1.5 min")
 */
export function formatTimeEstimate(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`
  }

  const minutes = seconds / 60
  if (minutes < 1) {
    return `${Math.round(seconds)} sec`
  }

  if (minutes < 10) {
    // Show one decimal place for short times
    return `${minutes.toFixed(1)} min`
  }

  // Round to nearest minute for longer times
  return `${Math.round(minutes)} min`
}

/**
 * Get time estimate with formatted string
 * 
 * @param rowCount - Number of rows to process
 * @param promptLength - Length of the prompt in characters
 * @param toolCount - Number of tools selected
 * @param concurrency - Number of concurrent requests (default: PARALLEL_CONCURRENCY)
 * @returns Object with seconds and formatted string
 */
export function getTimeEstimate(
  rowCount: number,
  promptLength: number,
  toolCount: number = 0,
  concurrency: number = PARALLEL_CONCURRENCY
): { seconds: number; formatted: string } {
  const seconds = estimateProcessingTime(rowCount, promptLength, toolCount, concurrency)
  return {
    seconds,
    formatted: formatTimeEstimate(seconds),
  }
}

