/**
 * ABOUTME: Batch status card component - visual summary of batch processing progress
 * ABOUTME: Shows success/error/pending counts with enhanced progress visualization
 */

'use client'

import { memo, useMemo } from 'react'
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import { ProgressBar } from '@/components/ui/progress-bar'
import { formatProgress } from '@/lib/utils/progress-calculator'

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

export const BatchStatusCard = memo(function BatchStatusCard({
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
  const pendingCount = useMemo(() => progress.total - successCount - errorCount, [progress.total, successCount, errorCount])
  // Use progress.completed from EventSource for real-time updates (most accurate)
  // Fallback to successCount + errorCount if progress.completed is not available
  const actualCompleted = useMemo(() => {
    return progress.completed !== undefined ? progress.completed : (successCount + errorCount)
  }, [progress.completed, successCount, errorCount])
  // Calculate percentage - ensure it never exceeds 100% and shows accurate progress
  const progressPercentage = useMemo(() => {
    if (progress.total === 0) return 0
    // Only show up to 100% - don't show misleading percentages
    return Math.min(100, (actualCompleted / progress.total) * 100)
  }, [progress.total, actualCompleted])
  // Format percentage using utility function for consistency
  const formattedPercentage = useMemo(() => {
    if (actualCompleted >= progress.total) return '100'
    // Use formatProgress utility, but without the % sign since we'll add it separately
    const percentage = formatProgress(actualCompleted, progress.total, true)
    return percentage.replace('%', '')
  }, [actualCompleted, progress.total])
  
  // Calculate processing rate (rows per second)
  const processingRate = useMemo(() => {
    if (!processingStartTime || actualCompleted === 0) return null
    const elapsed = (Date.now() - processingStartTime) / 1000 // seconds
    if (elapsed === 0) return null
    return actualCompleted / elapsed
  }, [processingStartTime, actualCompleted])

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-gradient-to-br from-secondary/50 to-background/50 animate-slide-in-up">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {/* Success */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-500/5 border border-green-500/10 rounded-lg transition-all duration-300 hover:bg-green-500/10">
          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Success</p>
            <p className="text-sm sm:text-base font-semibold text-green-400 tabular-nums transition-all duration-300 animate-count-up">{successCount}</p>
          </div>
        </div>

        {/* Errors */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-500/5 border border-red-500/10 rounded-lg transition-all duration-300 hover:bg-red-500/10">
          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Failed</p>
            <p className="text-sm sm:text-base font-semibold text-red-400 tabular-nums transition-all duration-300">{errorCount}</p>
          </div>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-primary/5 border border-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/10">
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
            <p className="text-sm sm:text-base font-semibold text-primary tabular-nums transition-all duration-300">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground font-medium">
              {actualCompleted} / {progress.total} processed
            </span>
            {actualCompleted > 0 && actualCompleted < progress.total && (
              <span className="text-muted-foreground/70">
                ({formattedPercentage}%)
              </span>
            )}
          </div>
          {estimatedSeconds && estimatedSeconds > 0 && actualCompleted < progress.total ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>~{Math.round(estimatedSeconds)}s remaining</span>
              {processingRate && processingRate > 0 && (
                <span className="text-muted-foreground/60 text-[10px]">
                  ({processingRate.toFixed(1)} rows/s)
                </span>
              )}
            </div>
          ) : actualCompleted === 0 ? (
            <span className="text-muted-foreground">
              Starting...
            </span>
          ) : actualCompleted >= progress.total ? (
            <span className="text-green-400 font-medium">
              Complete
            </span>
          ) : processingRate && processingRate > 0 ? (
            <span className="text-muted-foreground/70 text-[10px]">
              {processingRate.toFixed(1)} rows/s
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

        {/* Percentage - Only show if processing */}
        {actualCompleted < progress.total && (
          <div className="text-right">
            <span className="text-xs font-mono text-muted-foreground">
              {formattedPercentage}%
            </span>
          </div>
        )}
        
        {/* Token Consumption */}
        {(totalInputTokens !== undefined && totalInputTokens > 0) || (totalOutputTokens !== undefined && totalOutputTokens > 0) ? (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Token Consumption:</span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
})
