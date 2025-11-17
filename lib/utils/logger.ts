/**
 * Production-safe logging utilities
 * Logs are gated behind environment checks for production cleanliness
 */

/**
 * Log performance metrics (only in development or when explicitly enabled)
 */
export function logPerformance(metric: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_PERF_LOGS === 'true') {
    console.log(`[PERF] ${metric}:`, data)
  }
}

/**
 * Log debug information (only in development)
 */
export function logDebug(...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG]', ...args)
  }
}

/**
 * Log errors (always logged - important for production debugging)
 */
export function logError(message: string, error?: unknown, context?: Record<string, unknown>) {
  if (error) {
    console.error(`[ERROR] ${message}:`, error, context || {})
  } else {
    console.error(`[ERROR] ${message}`, context || {})
  }
}

/**
 * Log warnings (always logged - important for production)
 */
export function logWarning(message: string, context?: Record<string, unknown>) {
  console.warn(`[WARN] ${message}`, context || {})
}

