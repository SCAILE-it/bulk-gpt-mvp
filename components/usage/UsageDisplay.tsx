/**
 * ABOUTME: Displays user's current usage stats and limits
 * ABOUTME: Shows daily/monthly progress bars and plan information
 */

'use client'

import { useState, useEffect } from 'react'
import { Activity, TrendingUp, Calendar } from 'lucide-react'

interface UsageStats {
  batchesToday: number
  rowsToday: number
  batchesThisMonth: number
  rowsThisMonth: number
  totalBatches: number
  totalRows: number
  dailyBatchLimit: number
  dailyRowLimit: number
  planType: string
}

export function UsageDisplay() {
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadUsage() {
    try {
      setLoading(true)
      const response = await fetch('/api/usage')
      if (!response.ok) throw new Error('Failed to load usage')
      const data = await response.json()
      setUsage(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsage()
  }, [])

  function getPercentage(current: number, limit: number) {
    return Math.min(100, (current / limit) * 100)
  }

  function getProgressColor(percentage: number) {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-amber-500'
    return 'bg-primary'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading usage stats...</div>
      </div>
    )
  }

  if (error || !usage) {
    return (
      <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
        {error || 'Failed to load usage'}
      </div>
    )
  }

  const batchPercentage = getPercentage(usage.batchesToday, usage.dailyBatchLimit)
  const rowPercentage = getPercentage(usage.rowsToday, usage.dailyRowLimit)

  return (
    <div className="space-y-6">
      {/* Plan Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Usage & Limits</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Current plan: <span className="capitalize text-primary">{usage.planType}</span>
          </p>
        </div>
      </div>

      {/* Daily Limits */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Batches Today</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {usage.batchesToday} / {usage.dailyBatchLimit}
            </span>
          </div>
          <div className="h-2 bg-accent rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor(batchPercentage)}`}
              style={{ width: `${batchPercentage}%` }}
            />
          </div>
          {batchPercentage >= 90 && (
            <p className="text-xs text-amber-400 mt-1">
              ⚠️ Approaching daily batch limit
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Rows Today</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {usage.rowsToday.toLocaleString()} / {usage.dailyRowLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-accent rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor(rowPercentage)}`}
              style={{ width: `${rowPercentage}%` }}
            />
          </div>
          {rowPercentage >= 90 && (
            <p className="text-xs text-amber-400 mt-1">
              ⚠️ Approaching daily row limit
            </p>
          )}
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="border border-border rounded-lg p-4 bg-secondary/30">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">This Month</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xl font-semibold text-foreground">
              {usage.batchesThisMonth.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Batches</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-foreground">
              {usage.rowsThisMonth.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Rows</div>
          </div>
        </div>
      </div>

      {/* All-time Stats */}
      <div className="text-xs text-muted-foreground flex items-center justify-between">
        <span>All-time: {usage.totalBatches.toLocaleString()} batches</span>
        <span>{usage.totalRows.toLocaleString()} rows processed</span>
      </div>
    </div>
  )
}
