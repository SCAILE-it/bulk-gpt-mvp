'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Report to error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    })

    // Report to Sentry/LogRocket/etc
    if (typeof window !== 'undefined') {
      const windowWithSentry = window as Window & { Sentry?: { captureException: (error: Error, context?: { contexts?: Record<string, unknown> }) => void } }
      if (windowWithSentry.Sentry) {
        windowWithSentry.Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        })
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-zinc-900 border border-white/5 rounded-lg p-6 space-y-4">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>

              {/* Error Message */}
              <div className="text-center space-y-2">
                <h2 className="text-lg font-medium text-zinc-100">
                  Something went wrong
                </h2>
                <p className="text-sm text-zinc-400">
                  We&apos;ve encountered an unexpected error. Our team has been notified.
                </p>
              </div>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                    Error details
                  </summary>
                  <div className="mt-2 p-3 bg-zinc-950 rounded border border-white/5">
                    <p className="text-xs font-mono text-red-400 break-all">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="mt-2 text-xs text-zinc-600 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-md text-sm text-zinc-300 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-md text-sm text-zinc-300 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go home
                </button>
              </div>
            </div>

            {/* Beta Notice */}
            <p className="mt-4 text-center text-xs text-zinc-600">
              Bulk GPT is in beta. Thank you for your patience.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error)
    
    // Report to tracking service
    if (typeof window !== 'undefined') {
      const windowWithSentry = window as Window & { Sentry?: { captureException: (error: Error, extra?: { extra?: ErrorInfo }) => void } }
      if (windowWithSentry.Sentry) {
        windowWithSentry.Sentry.captureException(error, {
          extra: errorInfo,
        })
      }
    }
  }
}

// Specific error boundary for the bulk processor
export function BulkProcessorErrorBoundary({ children }: { children: ReactNode }) {
  const handleError = useErrorHandler()
  
  return (
    <ErrorBoundary
      onError={handleError}
      fallback={
        <div className="p-6 bg-zinc-900 border border-white/5 rounded-lg">
          <div className="flex items-center gap-3 text-yellow-500 mb-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Processing Error</span>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            The bulk processor encountered an error. This might be due to:
          </p>
          <ul className="text-sm text-zinc-500 list-disc list-inside space-y-1 mb-4">
            <li>Invalid CSV format</li>
            <li>Network connectivity issues</li>
            <li>API rate limits</li>
            <li>Server processing errors</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm transition-colors"
          >
            Reload Page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

