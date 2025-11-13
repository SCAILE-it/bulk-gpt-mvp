/**
 * ABOUTME: Batch status card component - visual summary of batch processing progress
 * ABOUTME: Shows success/error/pending counts with enhanced progress visualization
 */

'use client'

import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

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
}

export function BatchStatusCard({
  progress,
  successCount,
  errorCount,
  estimatedSeconds,
  isTesting = false
}: BatchStatusCardProps) {
  // For testing mode, show loading state
  if (isTesting && !progress) {
    return (
      <div className="px-6 py-4 border-b border-border bg-gradient-to-br from-secondary/50 to-background/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div>
            <p className="text-sm font-medium text-foreground">Testing with first row...</p>
            <p className="text-xs text-muted-foreground">Processing AI response</p>
          </div>
        </div>
      </div>
    )
  }

  if (!progress) return null

  // Calculate pending as remaining rows (total minus success minus errors)
  const pendingCount = progress.total - successCount - errorCount
  const progressPercentage = progress.total > 0
    ? (progress.completed / progress.total) * 100
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
            <p className="text-lg font-semibold text-green-400 tabular-nums transition-all duration-300">{successCount}</p>
          </div>
        </div>

        {/* Errors */}
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg transition-all duration-300 hover:bg-red-500/10">
          <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-lg font-semibold text-red-400 tabular-nums transition-all duration-300">{errorCount}</p>
          </div>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/10">
          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-lg font-semibold text-primary tabular-nums transition-all duration-300">{pendingCount}</p>
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
          {estimatedSeconds && estimatedSeconds > 0 && (
            <span className="text-muted-foreground">
              ~{estimatedSeconds}s remaining
            </span>
          )}
        </div>

        {/* Enhanced Progress Bar */}
        <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden border border-border">
          {/* Success segment */}
          <div
            className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-500 ease-linear"
            style={{ width: `${(successCount / progress.total) * 100}%` }}
          />
          {/* Error segment */}
          <div
            className="absolute top-0 h-full bg-red-500 transition-all duration-500 ease-linear"
            style={{
              left: `${(successCount / progress.total) * 100}%`,
              width: `${(errorCount / progress.total) * 100}%`
            }}
          />
          {/* Processing indicator (blue, no pulse) */}
          {pendingCount > 0 && (
            <div
              className="absolute top-0 h-full bg-primary/40 transition-all duration-500 ease-linear"
              style={{
                left: `${((successCount + errorCount) / progress.total) * 100}%`,
                width: `${(pendingCount / progress.total) * 100}%`
              }}
            />
          )}
        </div>

        {/* Percentage */}
        <div className="text-right">
          <span className="text-xs font-mono text-muted-foreground">
            {progressPercentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}
