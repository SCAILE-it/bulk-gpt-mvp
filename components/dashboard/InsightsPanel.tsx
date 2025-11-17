/**
 * Insights Panel Component
 * Displays trends, recommendations, and alerts based on analytics data
 */

'use client'

import React, { useMemo, memo } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, DollarSign, Activity, Zap } from 'lucide-react'
import { formatCost, getCostSavingsRecommendation, calculateCost, calculatePotentialSavings, calculateCostPerBatch, calculateCostPerRow } from '@/lib/utils/cost-calculator'
import { formatModelNameForDisplay } from '@/lib/utils/model-utils'
import { findPeakUsage, calculateTrendLine, detectSignificantChanges } from '@/lib/utils/chart-annotations'

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

interface Insight {
  type: 'trend' | 'recommendation' | 'alert'
  icon: React.ReactNode
  message: string
  color: string
}

interface InsightsPanelProps {
  tokenStats: {
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    modelBreakdown: Record<string, { input: number; output: number; batches: number }>
  }
  recentActivity: Array<{
    date: string
    batches: number
    rows: number
    inputTokens: number
    outputTokens: number
  }>
  previousPeriod?: {
    tokenStats: {
      totalInputTokens: number
      totalOutputTokens: number
      totalTokens: number
      modelBreakdown: Record<string, { input: number; output: number; batches: number }>
    }
    batchesByStatus: Record<string, number>
    totalBatches: number
  }
  dateRange?: '7d' | '30d' | '90d' | 'all'
  usageStats?: {
    tokens_this_month: number
    tokens_per_month_limit: number
  }
}

export const InsightsPanel = memo(function InsightsPanel({ tokenStats, recentActivity, previousPeriod, dateRange, usageStats }: InsightsPanelProps) {
  // Memoize chart data processing
  const chartDataWithTotal = useMemo(() => {
    return recentActivity.map(d => ({
      ...d,
      date: d.date,
      value: d.inputTokens + d.outputTokens
    }))
  }, [recentActivity])

  // Memoize insights calculation
  const insights: Insight[] = useMemo(() => {
    const result: Insight[] = []

    // Period comparison insights (more accurate than weekly comparison)
    if (previousPeriod && dateRange && dateRange !== 'all') {
      const periodLabel = dateRange === '7d' ? 'week' : dateRange === '30d' ? 'month' : 'quarter'
      
      // Token usage comparison
      if (previousPeriod.tokenStats.totalTokens > 0) {
        const tokenChange = ((tokenStats.totalTokens - previousPeriod.tokenStats.totalTokens) / previousPeriod.tokenStats.totalTokens) * 100
        const absTokenChange = Math.abs(tokenChange)
        
        if (absTokenChange > 5) {
          result.push({
            type: 'trend',
            icon: tokenChange > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />,
            message: `Token usage ${tokenChange > 0 ? 'increased' : 'decreased'} ${absTokenChange.toFixed(0)}% vs previous ${periodLabel}`,
            color: tokenChange > 0 ? 'text-amber-400' : 'text-green-400',
          })
        }
      }
    
      // Batch count comparison
      const currentBatches = Object.values(tokenStats.modelBreakdown).reduce((sum, stats) => sum + stats.batches, 0)
      const previousBatches = previousPeriod.totalBatches
      
      if (previousBatches > 0) {
        const batchChange = ((currentBatches - previousBatches) / previousBatches) * 100
        const absBatchChange = Math.abs(batchChange)
        
        if (absBatchChange > 10) {
          result.push({
            type: 'trend',
            icon: batchChange > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />,
            message: `Batch count ${batchChange > 0 ? 'increased' : 'decreased'} ${absBatchChange.toFixed(0)}% vs previous ${periodLabel}`,
            color: batchChange > 0 ? 'text-blue-400' : 'text-muted-foreground',
          })
        }
      }
    } else {
      // Fallback to weekly comparison from recent activity
      if (recentActivity.length >= 2) {
        const lastWeek = recentActivity.slice(-7)
        const previousWeek = recentActivity.slice(-14, -7)
        
        if (previousWeek.length > 0) {
          const lastWeekTotal = lastWeek.reduce((sum, d) => sum + d.inputTokens + d.outputTokens, 0)
          const previousWeekTotal = previousWeek.reduce((sum, d) => sum + d.inputTokens + d.outputTokens, 0)
          
          if (previousWeekTotal > 0) {
            const changePercent = ((lastWeekTotal - previousWeekTotal) / previousWeekTotal) * 100
            const absChange = Math.abs(changePercent)
            
            if (absChange > 10) {
              result.push({
                type: 'trend',
                icon: changePercent > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />,
                message: `Token usage ${changePercent > 0 ? 'increased' : 'decreased'} ${absChange.toFixed(0)}% compared to previous week`,
                color: changePercent > 0 ? 'text-amber-400' : 'text-green-400',
              })
            }
          }
        }
      }
    }

    // Chart-based insights: Peak usage patterns
    if (chartDataWithTotal.length > 0) {
      const peakMarker = findPeakUsage(chartDataWithTotal, 'value')
      if (peakMarker && chartDataWithTotal.length > 3) {
        const peakDate = new Date(peakMarker.date)
        const dayOfWeek = peakDate.toLocaleDateString('en-US', { weekday: 'long' })
        result.push({
          type: 'trend',
          icon: <Activity className="h-3.5 w-3.5" />,
          message: `Peak usage: ${formatNumber(peakMarker.value)} tokens on ${dayOfWeek} (${peakMarker.date})`,
          color: 'text-amber-400',
        })
      }

      // Trend analysis
      const trendLine = calculateTrendLine(chartDataWithTotal, 'value')
      if (trendLine && chartDataWithTotal.length >= 7) {
        if (trendLine.direction === 'up') {
          const increasePercent = ((trendLine.end.value - trendLine.start.value) / trendLine.start.value) * 100
          if (increasePercent > 10) {
            result.push({
              type: 'trend',
              icon: <TrendingUp className="h-3.5 w-3.5" />,
              message: `Usage trending upward: ${increasePercent.toFixed(0)}% increase over the period`,
              color: 'text-amber-400',
            })
          }
        } else if (trendLine.direction === 'down') {
          const decreasePercent = ((trendLine.start.value - trendLine.end.value) / trendLine.start.value) * 100
          if (decreasePercent > 10) {
            result.push({
              type: 'trend',
              icon: <TrendingDown className="h-3.5 w-3.5" />,
              message: `Usage trending downward: ${decreasePercent.toFixed(0)}% decrease over the period`,
              color: 'text-green-400',
            })
          }
        }
      }

      // Significant changes detection
      const significantChanges = detectSignificantChanges(chartDataWithTotal, 'value', 0.3) // 30% threshold
      if (significantChanges.length > 0 && significantChanges.length <= 3) {
        const largestChange = significantChanges.reduce((max, change) => 
          Math.abs(change.change) > Math.abs(max.change) ? change : max
        )
        result.push({
          type: 'alert',
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          message: `Significant change detected: ${largestChange.label} on ${largestChange.date}`,
          color: Math.abs(largestChange.change) > 50 ? 'text-red-400' : 'text-amber-400',
        })
      }
    }

    // Cost savings recommendations
    const potentialSavings = calculatePotentialSavings(tokenStats.modelBreakdown)
    if (potentialSavings && potentialSavings.savings > 0.01) {
      result.push({
        type: 'recommendation',
        icon: <Lightbulb className="h-3.5 w-3.5" />,
        message: `Switch to Flash model to save ${formatCost(potentialSavings.savings)} (${potentialSavings.savingsPercent.toFixed(0)}% savings)`,
        color: 'text-blue-400',
      })
    } else {
      // Fallback to individual model recommendations
      for (const [model, stats] of Object.entries(tokenStats.modelBreakdown)) {
        if (stats.input + stats.output > 0) {
          const recommendation = getCostSavingsRecommendation(model, {
            input: stats.input,
            output: stats.output,
          })
          
          if (recommendation) {
            result.push({
              type: 'recommendation',
              icon: <Lightbulb className="h-3.5 w-3.5" />,
              message: recommendation,
              color: 'text-blue-400',
            })
            break // Only show one recommendation
          }
        }
      }
    }

    // Usage limit warnings
    if (usageStats && usageStats.tokens_per_month_limit > 0) {
      const usagePercent = (usageStats.tokens_this_month / usageStats.tokens_per_month_limit) * 100
      
      if (usagePercent >= 90) {
        result.push({
          type: 'alert',
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          message: `You're using ${usagePercent.toFixed(0)}% of your monthly token limit`,
          color: 'text-red-400',
        })
      } else if (usagePercent >= 70) {
        result.push({
          type: 'alert',
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          message: `You're using ${usagePercent.toFixed(0)}% of your monthly token limit`,
          color: 'text-amber-400',
        })
      }
    }

    // Total cost insight with enhanced breakdown
    if (tokenStats.totalTokens > 0) {
      const totalCost = Object.entries(tokenStats.modelBreakdown).reduce((sum, [model, stats]) => {
        return sum + calculateCost(model, { input: stats.input, output: stats.output })
      }, 0)
      
      if (totalCost > 0.01) {
        const totalBatches = Object.values(tokenStats.modelBreakdown).reduce((sum, stats) => sum + stats.batches, 0)
        const totalRows = recentActivity.reduce((sum, d) => sum + d.rows, 0)
        const costPerBatch = calculateCostPerBatch(totalCost, totalBatches)
        const costPerRow = calculateCostPerRow(totalCost, totalRows)
        
        const costDetails = []
        if (costPerBatch > 0) costDetails.push(`${formatCost(costPerBatch)}/batch`)
        if (costPerRow > 0) costDetails.push(`${formatCost(costPerRow)}/row`)
        
        result.push({
          type: 'trend',
          icon: <DollarSign className="h-3.5 w-3.5" />,
          message: `Total estimated cost: ${formatCost(totalCost)}${costDetails.length > 0 ? ` (${costDetails.join(', ')})` : ''}`,
          color: 'text-foreground',
        })
      }
    }

    // Efficiency insights
    if (tokenStats.totalTokens > 0) {
      const totalBatches = Object.values(tokenStats.modelBreakdown).reduce((sum, stats) => sum + stats.batches, 0)
      if (totalBatches > 0) {
        const avgTokensPerBatch = tokenStats.totalTokens / totalBatches
        
        if (avgTokensPerBatch > 100000) {
          result.push({
            type: 'recommendation',
            icon: <Zap className="h-3.5 w-3.5" />,
            message: `Average ${formatNumber(Math.round(avgTokensPerBatch))} tokens per batch - consider batching smaller requests`,
            color: 'text-blue-400',
          })
        } else if (avgTokensPerBatch < 1000 && totalBatches > 5) {
          result.push({
            type: 'trend',
            icon: <Zap className="h-3.5 w-3.5" />,
            message: `Efficient usage: ${formatNumber(Math.round(avgTokensPerBatch))} tokens per batch on average`,
            color: 'text-green-400',
          })
        }
      }
    }

    // Model diversity insight
    const modelCount = Object.keys(tokenStats.modelBreakdown).filter(
      model => tokenStats.modelBreakdown[model].input + tokenStats.modelBreakdown[model].output > 0
    ).length
    
    if (modelCount > 1) {
      const modelEntries = Object.entries(tokenStats.modelBreakdown)
        .filter(([, stats]) => stats.input + stats.output > 0)
        .sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output))
      
      const topModel = modelEntries[0]
      const topModelUsage = topModel[1].input + topModel[1].output
      const topModelPercent = (topModelUsage / tokenStats.totalTokens) * 100
      
      if (topModelPercent > 80) {
        result.push({
          type: 'recommendation',
          icon: <Lightbulb className="h-3.5 w-3.5" />,
          message: `${formatModelNameForDisplay(topModel[0])} accounts for ${topModelPercent.toFixed(0)}% of usage - consider diversifying models`,
          color: 'text-blue-400',
        })
      }
    }

    return result
  }, [tokenStats, recentActivity, previousPeriod, dateRange, usageStats, chartDataWithTotal])

  if (insights.length === 0) {
    return null
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Insights</h3>
      </div>
      <div className="space-y-2">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start gap-2 text-xs">
            <div className={`flex-shrink-0 mt-0.5 ${insight.color}`}>
              {insight.icon}
            </div>
            <span className={`flex-1 ${insight.color === 'text-foreground' ? 'text-foreground' : insight.color}`}>
              {insight.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})

