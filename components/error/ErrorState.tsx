/**
 * Error State Component
 * Displays error messages with retry functionality
 */

'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

interface ErrorStateProps {
  error: string | Error
  onRetry?: () => void
  title?: string
  description?: string
  showRetry?: boolean
  variant?: 'default' | 'inline' | 'minimal'
}

export function ErrorState({
  error,
  onRetry,
  title,
  description,
  showRetry = true,
  variant = 'default',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error
  const displayTitle = title || 'Failed to load data'
  const displayDescription = description || errorMessage || 'An error occurred while loading data. Please try again.'

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400" role="alert" aria-live="polite">
        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>{displayDescription}</span>
        {showRetry && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-6 px-2 text-xs ml-2"
            aria-label="Retry loading data"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div 
        className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3"
        role="alert"
        aria-live="assertive"
      >
        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-400 mb-1">{displayTitle}</h3>
          <p className="text-xs text-muted-foreground">{displayDescription}</p>
          {showRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 h-7 px-3 text-xs"
              aria-label="Retry loading data"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Retry
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <EmptyState
      icon={AlertTriangle}
      title={displayTitle}
      description={displayDescription}
      action={
        showRetry && onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
              icon: RefreshCw,
            }
          : undefined
      }
      size="sm"
    />
  )
}

