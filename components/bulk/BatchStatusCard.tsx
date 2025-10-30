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
  progress: Progress
  successCount: number
  errorCount: number
  estimatedSeconds?: number | null
}

export function BatchStatusCard({
  progress,
  successCount,
  errorCount,
  estimatedSeconds
}: BatchStatusCardProps) {
  const pendingCount = progress.total - progress.completed
  const progressPercentage = progress.total > 0
    ? (progress.completed / progress.total) * 100
    : 0

  return (
    <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 animate-slide-in-up">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Success */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/5 border border-green-500/10 rounded-lg transition-all duration-300 hover:bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Success</p>
            <p className="text-lg font-semibold text-green-400 tabular-nums transition-all duration-300">{successCount}</p>
          </div>
        </div>

        {/* Errors */}
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg transition-all duration-300 hover:bg-red-500/10">
          <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Failed</p>
            <p className="text-lg font-semibold text-red-400 tabular-nums transition-all duration-300">{errorCount}</p>
          </div>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/10 rounded-lg transition-all duration-300 hover:bg-blue-500/10">
          <Clock className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Pending</p>
            <p className="text-lg font-semibold text-blue-400 tabular-nums transition-all duration-300">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-zinc-400 font-medium">
              {progress.completed} / {progress.total} completed
            </span>
          </div>
          {estimatedSeconds && estimatedSeconds > 0 && (
            <span className="text-zinc-500">
              ~{estimatedSeconds}s remaining
            </span>
          )}
        </div>

        {/* Enhanced Progress Bar */}
        <div className="relative w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
          {/* Success segment */}
          <div
            className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300 ease-out"
            style={{ width: `${(successCount / progress.total) * 100}%` }}
          />
          {/* Error segment */}
          <div
            className="absolute top-0 h-full bg-red-500 transition-all duration-300 ease-out"
            style={{
              left: `${(successCount / progress.total) * 100}%`,
              width: `${(errorCount / progress.total) * 100}%`
            }}
          />
          {/* Processing indicator (blue shimmer) */}
          {pendingCount > 0 && (
            <div
              className="absolute top-0 h-full bg-blue-500/50 transition-all duration-300 ease-out animate-pulse"
              style={{
                left: `${((successCount + errorCount) / progress.total) * 100}%`,
                width: `${(pendingCount / progress.total) * 100}%`
              }}
            />
          )}
        </div>

        {/* Percentage */}
        <div className="text-right">
          <span className="text-xs font-mono text-zinc-500">
            {progressPercentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}
