/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div 
          className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-secondary/40 border border-border rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="h-12 w-12 text-red-400 mb-4" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={this.handleReset}
              variant="outline"
              className="flex items-center gap-2"
              aria-label="Try again"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={this.handleReload}
              variant="default"
              className="flex items-center gap-2"
              aria-label="Reload page"
            >
              Reload Page
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-2xl">
              <summary className="text-xs text-muted-foreground cursor-pointer mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-xs bg-background border border-border rounded p-4 overflow-auto max-h-64">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

