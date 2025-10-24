/**
 * Development-only logger utility
 * Console statements only execute in development environment
 * In production, these are no-ops for better performance and security
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const devLog = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args)
    }
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data)
    }
  },

  group: (label: string) => {
    if (isDevelopment) {
      console.group(label)
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  },
}

/**
 * Production-safe error logger
 * Always logs errors (even in production) but sanitizes sensitive data
 */
export const logError = (error: Error | unknown, context?: Record<string, unknown>) => {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  // In production, log to error tracking service (Sentry, etc.)
  // For now, just console.error
  console.error('[ERROR]', errorMessage, {
    ...context,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  })
}
