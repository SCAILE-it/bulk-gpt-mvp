/**
 * ABOUTME: Batch status card component - visual summary of batch processing progress
 * ABOUTME: Shows success/error/pending counts with enhanced progress visualization
 */

'use client'

import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import { ProgressBar } from '@/components/ui/progress-bar'

interface Progress {
  completed: number
  total: number
}

interface BatchStatusCardProps {
  progress?: Progress
  successCount: number
  errorCount: number
  estimatedSeconds?: number | null
  isTesting?: boolean
  testStartTime?: number
  processingStartTime?: number
  totalInputTokens?: number
  totalOutputTokens?: number
}

export function BatchStatusCard({
  progress,
  successCount,
  errorCount,
  estimatedSeconds,
  isTesting = false,
  testStartTime,
  processingStartTime,
  totalInputTokens,
  totalOutputTokens
}: BatchStatusCardProps) {
  const testEstimatedDuration = estimatedSeconds ? estimatedSeconds * 1000 : 60000 // Use provided estimate or default 60s

  // For testing mode, show loading state with progress bar
  if (isTesting && !progress) {
    return (
      <div className="px-6 py-4 border-b border-border bg-gradient-to-br from-secondary/50 to-background/50">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Testing with first row...</p>
              <p className="text-xs text-muted-foreground">
                Processing AI response{estimatedSeconds ? ` (~${Math.ceil(estimatedSeconds)}s)` : ''}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <ProgressBar
            isActive={isTesting && !progress}
            estimatedDuration={testEstimatedDuration}
            startTime={testStartTime}
            height="md"
          />
        </div>
      </div>
    )
  }

  if (!progress) return null

  // Calculate pending as remaining rows (total minus success minus errors)
  const pendingCount = progress.total - successCount - errorCount
  // Use progress.completed from EventSource for real-time updates (most accurate)
  // Fallback to successCount + errorCount if progress.completed is not available
  const actualCompleted = progress.completed !== undefined ? progress.completed : (successCount + errorCount)
  const progressPercentage = progress.total > 0
    ? (actualCompleted / progress.total) * 100
    : 0

  return (
    <div className="px-6 py-4 border-b border-border bg-gradient-to-br from-secondary/50 to-background/50 animate-slide-in-up">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Success */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/5 border border-green-500/10 rounded-lg transition-all duration-300 hover:bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Success</p>
            <p className="text-base font-semibold text-green-400 tabular-nums transition-all duration-300">{successCount}</p>
          </div>
        </div>

        {/* Errors */}
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg transition-all duration-300 hover:bg-red-500/10">
          <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-base font-semibold text-red-400 tabular-nums transition-all duration-300">{errorCount}</p>
          </div>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/10">
          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-base font-semibold text-primary tabular-nums transition-all duration-300">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">
              {successCount + errorCount} / {progress.total} processed
            </span>
          </div>
          {estimatedSeconds && estimatedSeconds > 0 ? (
            <span className="text-muted-foreground">
              ~{Math.round(estimatedSeconds)}s remaining
            </span>
          ) : progress && actualCompleted === 0 ? (
            <span className="text-muted-foreground">
              Starting...
            </span>
          ) : null}
        </div>

        {/* Use same ProgressBar component as AI optimization */}
        <ProgressBar
          isActive={actualCompleted < progress.total}
          estimatedDuration={estimatedSeconds ? estimatedSeconds * 1000 : 60000}
          startTime={processingStartTime}
          actualProgress={actualCompleted > 0 ? progressPercentage : undefined}
          height="md"
        />

        {/* Percentage */}
        <div className="text-right">
          <span className="text-xs font-mono text-muted-foreground">
            {progressPercentage.toFixed(1)}%
          </span>
        </div>
        
        {/* Token Consumption */}
        {(totalInputTokens !== undefined && totalInputTokens > 0) || (totalOutputTokens !== undefined && totalOutputTokens > 0) ? (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Token Consumption:</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  Input: <span className="font-mono text-foreground">{totalInputTokens?.toLocaleString() || 0}</span>
                </span>
                <span className="text-muted-foreground">
                  Output: <span className="font-mono text-foreground">{totalOutputTokens?.toLocaleString() || 0}</span>
                </span>
                <span className="text-muted-foreground">
                  Total: <span className="font-mono text-foreground font-semibold">
                    {((totalInputTokens || 0) + (totalOutputTokens || 0)).toLocaleString()}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
