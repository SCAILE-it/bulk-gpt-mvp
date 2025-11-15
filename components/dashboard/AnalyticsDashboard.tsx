/**
 * ABOUTME: Analytics dashboard showing usage statistics, token consumption, and model breakdown
 * ABOUTME: Displays comprehensive analytics for user's batch processing activity
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Activity, Zap, BarChart3, Clock } from 'lucide-react'
import { UsageDisplay } from '@/components/usage/UsageDisplay'

interface TokenStats {
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  modelBreakdown: Record<string, { input: number; output: number; batches: number }>
}

interface AnalyticsData {
  tokenStats: TokenStats
  batchesByStatus: Record<string, number>
  recentActivity: Array<{
    date: string
    batches: number
    rows: number
  }>
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      const supabase = createClient()
      if (!supabase) {
        setError('Supabase client not configured')
        setIsLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Not authenticated')
          setIsLoading(false)
          return
        }

        // Fetch all batches with token data
        const { data: batches, error: batchesError } = await supabase
          .from('batches')
          .select('id, status, created_at')
          .eq('user_id', user.id)

        if (batchesError) throw batchesError

        // Fetch token data for all batches
        const tokenStats: TokenStats = {
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          modelBreakdown: {},
        }

        const batchesByStatus: Record<string, number> = {}
        const recentActivityMap: Record<string, { batches: number; rows: number }> = {}

        for (const batch of batches || []) {
          // Count by status
          batchesByStatus[batch.status] = (batchesByStatus[batch.status] || 0) + 1

          // Get token data for this batch
          const { data: results } = await supabase
            .from('batch_results')
            .select('input_tokens, output_tokens, model')
            .eq('batch_id', batch.id)
            .limit(1000)

          if (results && results.length > 0) {
            const batchInputTokens = results.reduce((sum, r) => sum + (r.input_tokens || 0), 0)
            const batchOutputTokens = results.reduce((sum, r) => sum + (r.output_tokens || 0), 0)
            const model = results.find(r => r.model)?.model || 'unknown'

            tokenStats.totalInputTokens += batchInputTokens
            tokenStats.totalOutputTokens += batchOutputTokens
            tokenStats.totalTokens += batchInputTokens + batchOutputTokens

            if (!tokenStats.modelBreakdown[model]) {
              tokenStats.modelBreakdown[model] = { input: 0, output: 0, batches: 0 }
            }
            tokenStats.modelBreakdown[model].input += batchInputTokens
            tokenStats.modelBreakdown[model].output += batchOutputTokens
            tokenStats.modelBreakdown[model].batches += 1
          }

          // Track recent activity by date
          const date = new Date(batch.created_at).toISOString().split('T')[0]
          if (!recentActivityMap[date]) {
            recentActivityMap[date] = { batches: 0, rows: 0 }
          }
          recentActivityMap[date].batches += 1

          // Get row count for this batch
          const { data: batchData } = await supabase
            .from('batches')
            .select('total_rows')
            .eq('id', batch.id)
            .single()

          if (batchData) {
            recentActivityMap[date].rows += batchData.total_rows || 0
          }
        }

        // Convert recent activity map to array and sort by date (most recent first)
        const recentActivity = Object.entries(recentActivityMap)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 7) // Last 7 days

        setAnalytics({
          tokenStats,
          batchesByStatus,
          recentActivity,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Usage & Limits
          </CardTitle>
          <CardDescription className="text-xs">
            Your current usage and plan limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsageDisplay />
        </CardContent>
      </Card>

      {/* Token Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Token Usage
          </CardTitle>
          <CardDescription className="text-xs">
            Total tokens consumed across all batches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-secondary/40 border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Input Tokens</div>
              <div className="text-lg font-semibold text-foreground">
                {formatNumber(analytics.tokenStats.totalInputTokens)}
              </div>
            </div>
            <div className="bg-secondary/40 border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Output Tokens</div>
              <div className="text-lg font-semibold text-foreground">
                {formatNumber(analytics.tokenStats.totalOutputTokens)}
              </div>
            </div>
            <div className="bg-secondary/40 border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Tokens</div>
              <div className="text-lg font-semibold text-primary">
                {formatNumber(analytics.tokenStats.totalTokens)}
              </div>
            </div>
          </div>

          {/* Model Breakdown */}
          {Object.keys(analytics.tokenStats.modelBreakdown).length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-foreground">Model Breakdown</div>
              <div className="space-y-2">
                {Object.entries(analytics.tokenStats.modelBreakdown)
                  .sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output))
                  .map(([model, stats]) => {
                    const total = stats.input + stats.output
                    const percentage = analytics.tokenStats.totalTokens > 0
                      ? (total / analytics.tokenStats.totalTokens) * 100
                      : 0
                    return (
                      <div key={model} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{model}</span>
                          <span className="text-muted-foreground">
                            {formatNumber(total)} tokens ({stats.batches} batches)
                          </span>
                        </div>
                        <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Batch Status Overview
          </CardTitle>
          <CardDescription className="text-xs">
            Distribution of batch statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(analytics.batchesByStatus).map(([status, count]) => {
              const total = Object.values(analytics.batchesByStatus).reduce((a, b) => a + b, 0)
              const percentage = total > 0 ? (count / total) * 100 : 0
              const statusColors: Record<string, string> = {
                completed: 'text-green-400',
                failed: 'text-red-400',
                processing: 'text-primary',
                pending: 'text-muted-foreground',
                completed_with_errors: 'text-yellow-400',
              }
              return (
                <div key={status} className="bg-secondary/40 border border-border rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1 capitalize">{status.replace('_', ' ')}</div>
                  <div className={`text-lg font-semibold ${statusColors[status] || 'text-foreground'}`}>
                    {count}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{percentage.toFixed(1)}% of total</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {analytics.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity (Last 7 Days)
            </CardTitle>
            <CardDescription className="text-xs">
              Daily batch and row processing activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentActivity.map((activity) => {
                const date = new Date(activity.date)
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div key={activity.date} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-medium text-foreground w-20">{dateStr}</div>
                      <div className="text-xs text-muted-foreground">
                        {activity.batches} batch{activity.batches !== 1 ? 'es' : ''}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.rows.toLocaleString()} rows
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

