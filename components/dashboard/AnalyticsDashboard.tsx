/**
 * ABOUTME: Analytics dashboard showing usage statistics, token consumption, and model breakdown
 * ABOUTME: Displays comprehensive analytics with charts using recharts
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Activity, Zap, BarChart3, Clock, TrendingUp, TrendingDown, ExternalLinkIcon, Download, Calendar, Lightbulb, Image as ImageIcon, FileText, Maximize2, RefreshCw, Pause, Play, GitCompare, Filter, Bookmark, X, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { exportSVGAsPNG, exportElementAsPNG, exportDashboardAsPDF, findChartSVG } from '@/lib/utils/chart-export'
import { exportAnalyticsSummaryCSV, exportAnalyticsJSON, exportTokenActivityCSV } from '@/lib/utils/data-export'
import { UsageDisplay } from '@/components/usage/UsageDisplay'

// Lazy load modal - only loads when user clicks to expand a chart
const ChartModal = dynamic(
  () => import('@/components/charts/ChartModal').then(mod => ({ default: mod.ChartModal })),
  { ssr: false }
)

// Lazy load recharts components to reduce initial bundle size
import {
  LazyLineChart as LineChart,
  LazyLine as Line,
  LazyBarChart as BarChart,
  LazyBar as Bar,
  LazyXAxis as XAxis,
  LazyYAxis as YAxis,
  LazyCartesianGrid as CartesianGrid,
  LazyTooltip as Tooltip,
  LazyLegend as Legend,
  LazyResponsiveContainer as ResponsiveContainer,
  LazyReferenceLine as ReferenceLine,
  LazyLabel as Label,
} from '@/components/charts/LazyChartComponents'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { normalizeModelName, formatModelNameForDisplay } from '@/lib/utils/model-utils'
import { calculateTotalCost, formatCost, calculateCost, calculateCostPerBatch, calculateCostPerRow, calculatePotentialSavings } from '@/lib/utils/cost-calculator'
import { findPeakUsage, calculateAverage } from '@/lib/utils/chart-annotations'
import { InsightsPanel } from '@/components/dashboard/InsightsPanel'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { ErrorState } from '@/components/error/ErrorState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ComparisonWidget } from '@/components/dashboard/ComparisonWidget'
import { useSavedFilters } from '@/hooks/useSavedFilters'
import { Button } from '@/components/ui/button'
import { ChartSkeleton } from '@/components/skeletons/ChartSkeleton'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { HelpCircle } from 'lucide-react'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

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
    inputTokens: number
    outputTokens: number
  }>
  previousPeriod?: {
    tokenStats: TokenStats
    batchesByStatus: Record<string, number>
    totalBatches: number
  }
}

const CHART_COLORS = {
  primary: 'hsl(var(--chart-1))',
  secondary: 'hsl(var(--chart-2))',
  success: 'hsl(var(--chart-3))',
  warning: 'hsl(var(--chart-4))',
  accent: 'hsl(var(--chart-5))',
}

const STATUS_COLORS: Record<string, string> = {
  completed: CHART_COLORS.secondary,
  failed: CHART_COLORS.success,
  processing: CHART_COLORS.primary,
  pending: '#6b7280',
  completed_with_errors: CHART_COLORS.warning,
}


type DateRangePreset = '7d' | '30d' | '90d' | 'all'
type DateRange = DateRangePreset | { from: Date; to: Date }

export function AnalyticsDashboard() {
  const router = useRouter()
  const { isMobile, isTablet } = useMediaQuery()
  const { preferences, updatePreferences, isLoading: preferencesLoading } = useDashboardPreferences()
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [exportingChart, setExportingChart] = useState<string | null>(null)
  const [exportingDashboard, setExportingDashboard] = useState(false)
  const [expandedChart, setExpandedChart] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30000)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [notifiedThresholds, setNotifiedThresholds] = useState<Set<string>>(new Set())
  const [comparisonMode, setComparisonMode] = useState(false) // Toggle for side-by-side comparison
  const [showFilterPresets, setShowFilterPresets] = useState(false)
  const [showSaveFilterDialog, setShowSaveFilterDialog] = useState(false)
  const [filterPresetName, setFilterPresetName] = useState('')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  
  const { presets, savePreset, updateLastUsed, deletePreset, findMatchingPreset } = useSavedFilters()
  
  // Manual refresh handler - defined early to avoid dependency issues
  const handleManualRefresh = useCallback(() => {
    setRetryCount(0)
    setError(null)
    setIsLoading(true)
    setLastRefreshTime(new Date())
  }, [])

  // Export dashboard handler - defined early to avoid dependency issues  
  const handleExportDashboardRef = useRef<() => Promise<void>>()
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd + R - Refresh
      if (modKey && e.key === 'r') {
        e.preventDefault()
        handleManualRefresh()
      }

      // Ctrl/Cmd + E - Export dashboard as PDF
      if (modKey && e.key === 'e') {
        e.preventDefault()
        if (analytics && analytics.tokenStats.totalTokens > 0 && handleExportDashboardRef.current) {
          handleExportDashboardRef.current()
        }
      }

      // Ctrl/Cmd + Shift + C - Export CSV
      if (modKey && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        if (analytics) {
          exportAnalyticsSummaryCSV(analytics, dateRange, {
            includeFilters: true,
          })
          toast.success('CSV exported successfully')
        }
      }

      // Ctrl/Cmd + Shift + J - Export JSON
      if (modKey && e.shiftKey && e.key === 'J') {
        e.preventDefault()
        if (analytics) {
          exportAnalyticsJSON(analytics, dateRange, {
            model: selectedModel,
            status: selectedStatus,
          }, {
            includeFilters: true,
          })
          toast.success('JSON exported successfully')
        }
      }

      // Ctrl/Cmd + F - Focus filters (open filter presets)
      if (modKey && e.key === 'f') {
        e.preventDefault()
        setShowFilterPresets(true)
      }

      // Ctrl/Cmd + ? - Show keyboard shortcuts
      if (modKey && e.key === '?') {
        e.preventDefault()
        setShowKeyboardShortcuts(true)
      }

      // Escape - Close modals/popovers
      if (e.key === 'Escape') {
        setShowFilterPresets(false)
        setShowSaveFilterDialog(false)
        setShowKeyboardShortcuts(false)
        setExpandedChart(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [analytics, dateRange, selectedModel, selectedStatus, handleManualRefresh])
  
  // Update state when preferences load
  useEffect(() => {
    if (!preferencesLoading) {
      setDateRange(preferences.defaultDateRange)
      setAutoRefresh(preferences.autoRefresh)
      setRefreshInterval(preferences.refreshInterval)
    }
  }, [preferencesLoading, preferences.defaultDateRange, preferences.autoRefresh, preferences.refreshInterval])
  
  // Refs for chart containers
  const tokenUsageChartRef = useRef<HTMLDivElement>(null)
  const batchStatusChartRef = useRef<HTMLDivElement>(null)
  const modelBreakdownChartRef = useRef<HTMLDivElement>(null)
  const recentActivityChartRef = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  
  // Refs for expanded chart modals
  const expandedTokenUsageRef = useRef<HTMLDivElement>(null)
  const expandedBatchStatusRef = useRef<HTMLDivElement>(null)
  const expandedModelBreakdownRef = useRef<HTMLDivElement>(null)
  const expandedRecentActivityRef = useRef<HTMLDivElement>(null)

  const handleChartClick = useCallback((data: { name?: string }, chartType: string) => {
    // Navigate to batches page with filter
    if (chartType === 'status' && data?.name) {
      const status = data.name.toLowerCase().replace(/\s+/g, '_')
      router.push(`/agents?status=${status}`)
    } else if (chartType === 'model' && data?.name) {
      router.push(`/agents?model=${encodeURIComponent(data.name)}`)
    }
  }, [router])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || isLoading) return

    const intervalId = setInterval(() => {
      // Only refresh if not currently loading and no errors
      if (!isLoading && !error) {
        setLastRefreshTime(new Date())
        // Trigger refetch by updating retryCount to 0 and clearing error
        setRetryCount(0)
        setError(null)
        setIsLoading(true)
      }
    }, refreshInterval)

    return () => clearInterval(intervalId)
  }, [autoRefresh, refreshInterval, isLoading, error])

  // Update preferences when auto-refresh or refresh interval changes
  useEffect(() => {
    updatePreferences({ autoRefresh, refreshInterval })
  }, [autoRefresh, refreshInterval, updatePreferences])

  // Update preferences when date range changes
  useEffect(() => {
    if (typeof dateRange === 'string') {
      updatePreferences({ defaultDateRange: dateRange })
    }
  }, [dateRange, updatePreferences])

  // Apply filter preset
  const applyPreset = useCallback((preset: { id?: string; name?: string; filters: { model?: string | null; status?: string | null; dateRange?: string | { from: Date; to: Date } } }) => {
    if (preset.filters.model !== undefined) {
      setSelectedModel(preset.filters.model)
    }
    if (preset.filters.status !== undefined) {
      setSelectedStatus(preset.filters.status)
    }
    if (preset.filters.dateRange !== undefined) {
      setDateRange(preset.filters.dateRange as DateRange)
    }
    if (preset.id) {
      updateLastUsed(preset.id)
    }
    setShowFilterPresets(false)
    toast.success('Filter preset applied', {
      description: `Applied "${preset.name || 'preset'}" filters`,
    })
  }, [updateLastUsed])

  // Save current filters as preset
  const handleSavePreset = useCallback(() => {
    if (!filterPresetName.trim()) {
      toast.error('Please enter a name for the filter preset')
      return
    }

    const currentFilters = {
      model: selectedModel,
      status: selectedStatus,
      dateRange: dateRange,
    }

    savePreset(filterPresetName.trim(), currentFilters)
    setFilterPresetName('')
    setShowSaveFilterDialog(false)
    toast.success('Filter preset saved', {
      description: `"${filterPresetName.trim()}" has been saved`,
    })
  }, [filterPresetName, selectedModel, selectedStatus, dateRange, savePreset])

  // Check if current filters match a preset
  const currentMatchingPreset = useMemo(() => {
    return findMatchingPreset({
      model: selectedModel,
      status: selectedStatus,
      dateRange: dateRange,
    })
  }, [selectedModel, selectedStatus, dateRange, findMatchingPreset])

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true)
      setError(null)
      
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

        // Calculate date filter based on selected range
        let dateFilter: Date | null = null
        let dateFilterEnd: Date | null = null
        let previousPeriodStart: Date | null = null
        let previousPeriodEnd: Date | null = null
        const now = new Date()
        
        if (typeof dateRange === 'object' && dateRange.from && dateRange.to) {
          // Custom date range
          dateFilter = dateRange.from
          dateFilterEnd = dateRange.to
          const rangeDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (24 * 60 * 60 * 1000))
          previousPeriodEnd = new Date(dateRange.from.getTime() - 1)
          previousPeriodStart = new Date(previousPeriodEnd.getTime() - rangeDays * 24 * 60 * 60 * 1000)
        } else {
          // Preset range
          switch (dateRange) {
            case '7d':
              dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              dateFilterEnd = now
              previousPeriodEnd = dateFilter
              previousPeriodStart = new Date(previousPeriodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
              break
            case '30d':
              dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              dateFilterEnd = now
              previousPeriodEnd = dateFilter
              previousPeriodStart = new Date(previousPeriodEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
              break
            case '90d':
              dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
              dateFilterEnd = now
              previousPeriodEnd = dateFilter
              previousPeriodStart = new Date(previousPeriodEnd.getTime() - 90 * 24 * 60 * 60 * 1000)
              break
            case 'all':
            default:
              dateFilter = null
              dateFilterEnd = null
              previousPeriodStart = null
              previousPeriodEnd = null
          }
        }

        // Build query with optional date filter
        let batchesQuery = supabase
          .from('batches')
          .select('id, status, created_at, total_rows')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (dateFilter) {
          batchesQuery = batchesQuery.gte('created_at', dateFilter.toISOString())
          if (dateFilterEnd) {
            batchesQuery = batchesQuery.lte('created_at', dateFilterEnd.toISOString())
          }
        }

        const { data: batches, error: batchesError } = await batchesQuery

        if (batchesError) throw batchesError

        // Fetch token data for all batches
        const tokenStats: TokenStats = {
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          modelBreakdown: {},
        }

        const batchesByStatus: Record<string, number> = {}
        const recentActivityMap: Record<string, { batches: number; rows: number; inputTokens: number; outputTokens: number }> = {}

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
            // Aggregate tokens by model (handle batches with multiple models)
            const modelTokens: Record<string, { input: number; output: number }> = {}
            
            for (const result of results) {
              const rawModel = result.model || 'unknown'
              const normalizedModel = normalizeModelName(rawModel)
              
              if (!modelTokens[normalizedModel]) {
                modelTokens[normalizedModel] = { input: 0, output: 0 }
              }
              
              modelTokens[normalizedModel].input += result.input_tokens || 0
              modelTokens[normalizedModel].output += result.output_tokens || 0
            }
            
            // Add to overall stats
            for (const [model, tokens] of Object.entries(modelTokens)) {
              tokenStats.totalInputTokens += tokens.input
              tokenStats.totalOutputTokens += tokens.output
              tokenStats.totalTokens += tokens.input + tokens.output
              
              if (!tokenStats.modelBreakdown[model]) {
                tokenStats.modelBreakdown[model] = { input: 0, output: 0, batches: 0 }
              }
              tokenStats.modelBreakdown[model].input += tokens.input
              tokenStats.modelBreakdown[model].output += tokens.output
              tokenStats.modelBreakdown[model].batches += 1
            }
          }

          // Track recent activity by date
          const date = new Date(batch.created_at).toISOString().split('T')[0]
          if (!recentActivityMap[date]) {
            recentActivityMap[date] = { batches: 0, rows: 0, inputTokens: 0, outputTokens: 0 }
          }
          recentActivityMap[date].batches += 1
          recentActivityMap[date].rows += batch.total_rows || 0
          
          if (results && results.length > 0) {
            const batchInputTokens = results.reduce((sum, r) => sum + (r.input_tokens || 0), 0)
            const batchOutputTokens = results.reduce((sum, r) => sum + (r.output_tokens || 0), 0)
            recentActivityMap[date].inputTokens += batchInputTokens
            recentActivityMap[date].outputTokens += batchOutputTokens
          }
        }

        // Convert recent activity map to array and sort by date (most recent first)
        const recentActivity = Object.entries(recentActivityMap)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date)) // Sort chronologically for chart
          .slice(-7) // Last 7 days

        // Fetch previous period data for comparison (if date range is not 'all')
        let previousPeriodData: AnalyticsData['previousPeriod'] | undefined = undefined
        
        if (previousPeriodStart && previousPeriodEnd && dateRange !== 'all') {
          const previousBatchesQuery = supabase
            .from('batches')
            .select('id, status, created_at, total_rows')
            .eq('user_id', user.id)
            .gte('created_at', previousPeriodStart.toISOString())
            .lt('created_at', previousPeriodEnd.toISOString())
            .order('created_at', { ascending: false })

          const { data: previousBatches } = await previousBatchesQuery

          const previousTokenStats: TokenStats = {
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalTokens: 0,
            modelBreakdown: {},
          }

          const previousBatchesByStatus: Record<string, number> = {}

          for (const batch of previousBatches || []) {
            previousBatchesByStatus[batch.status] = (previousBatchesByStatus[batch.status] || 0) + 1

            const { data: results } = await supabase
              .from('batch_results')
              .select('input_tokens, output_tokens, model')
              .eq('batch_id', batch.id)
              .limit(1000)

            if (results && results.length > 0) {
              const modelTokens: Record<string, { input: number; output: number }> = {}
              
              for (const result of results) {
                const rawModel = result.model || 'unknown'
                const normalizedModel = normalizeModelName(rawModel)
                
                if (!modelTokens[normalizedModel]) {
                  modelTokens[normalizedModel] = { input: 0, output: 0 }
                }
                
                modelTokens[normalizedModel].input += result.input_tokens || 0
                modelTokens[normalizedModel].output += result.output_tokens || 0
              }
              
              for (const [model, tokens] of Object.entries(modelTokens)) {
                previousTokenStats.totalInputTokens += tokens.input
                previousTokenStats.totalOutputTokens += tokens.output
                previousTokenStats.totalTokens += tokens.input + tokens.output
                
                if (!previousTokenStats.modelBreakdown[model]) {
                  previousTokenStats.modelBreakdown[model] = { input: 0, output: 0, batches: 0 }
                }
                previousTokenStats.modelBreakdown[model].input += tokens.input
                previousTokenStats.modelBreakdown[model].output += tokens.output
                previousTokenStats.modelBreakdown[model].batches += 1
              }
            }
          }

          previousPeriodData = {
            tokenStats: previousTokenStats,
            batchesByStatus: previousBatchesByStatus,
            totalBatches: previousBatches?.length || 0,
          }
        }

        const analyticsData = {
          tokenStats,
          batchesByStatus,
          recentActivity,
          previousPeriod: previousPeriodData,
        }
        
        const previousAnalytics = analytics
        setAnalytics(analyticsData)
        setLastRefreshTime(new Date())
        
        // Check thresholds and show alerts (only after initial load)
        if (previousAnalytics) {
          // Threshold checking
          const totalCost = calculateTotalCost(tokenStats.modelBreakdown)
          
          // Cost threshold alert (> $10)
          if (totalCost > 10 && !notifiedThresholds.has('cost-high')) {
            toast.warning('High cost detected', {
              description: `Your estimated cost is ${formatCost(totalCost)}. Consider reviewing your usage.`,
              duration: 5000,
            })
            setNotifiedThresholds(prev => new Set(prev).add('cost-high'))
          }
          
          // Token usage spike alert (> 1M tokens)
          if (tokenStats.totalTokens > 1000000 && !notifiedThresholds.has('tokens-high')) {
            toast.info('High token usage', {
              description: `You've used ${formatNumber(tokenStats.totalTokens)} tokens. Consider optimizing your prompts.`,
              duration: 5000,
            })
            setNotifiedThresholds(prev => new Set(prev).add('tokens-high'))
          }
          
          // Potential savings alert
          const potentialSavings = calculatePotentialSavings(tokenStats.modelBreakdown)
          if (potentialSavings && potentialSavings.savings > 1 && !notifiedThresholds.has('savings-opportunity')) {
            toast.info('Cost savings opportunity', {
              description: `Switch to Flash model to save ${formatCost(potentialSavings.savings)} (${potentialSavings.savingsPercent.toFixed(0)}% savings)`,
              duration: 8000,
              action: {
                label: 'Learn More',
                onClick: () => router.push('/profile'),
              },
            })
            setNotifiedThresholds(prev => new Set(prev).add('savings-opportunity'))
          }
        }
      } catch (err) {
        console.error('Error fetching analytics:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics'
        setError(errorMessage)
        
        // Auto-retry logic (max 3 retries)
        if (retryCount < 3) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000) // Exponential backoff, max 5s
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
            fetchAnalytics()
          }, delay)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [dateRange, retryCount])

  // Reset retry count when date range changes
  useEffect(() => {
    setRetryCount(0)
  }, [dateRange])

  const handleRetry = useCallback(() => {
    setRetryCount(0)
    setError(null)
    setIsLoading(true)
  }, [])

  // Helper functions - MUST be before hooks that use them
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  // Helper function to calculate percentage change
  const calculatePercentageChange = (current: number, previous: number): { percent: number; isIncrease: boolean } | null => {
    if (previous === 0) return current > 0 ? { percent: 100, isIncrease: true } : null
    const change = ((current - previous) / previous) * 100
    return {
      percent: Math.abs(change),
      isIncrease: change > 0,
    }
  }

  // Memoize expensive calculations - MUST be before early returns (Rules of Hooks)
  const totalCost = useMemo(() => 
    analytics ? calculateTotalCost(analytics.tokenStats.modelBreakdown) : 0,
    [analytics?.tokenStats.modelBreakdown]
  )
  
  // Calculate previous period cost if available
  const previousTotalCost = useMemo(() => 
    analytics?.previousPeriod
      ? calculateTotalCost(analytics.previousPeriod.tokenStats.modelBreakdown)
      : 0,
    [analytics?.previousPeriod]
  )
  
  // Calculate comparison metrics
  const tokenComparison = useMemo(() => 
    analytics?.previousPeriod
      ? calculatePercentageChange(analytics.tokenStats.totalTokens, analytics.previousPeriod.tokenStats.totalTokens)
      : null,
    [analytics?.previousPeriod, analytics?.tokenStats.totalTokens]
  )
  
  const costComparison = useMemo(() => 
    analytics?.previousPeriod && previousTotalCost > 0
      ? calculatePercentageChange(totalCost, previousTotalCost)
      : null,
    [analytics?.previousPeriod, previousTotalCost, totalCost]
  )
  
  const batchesComparison = useMemo(() => 
    analytics?.previousPeriod && analytics.previousPeriod.totalBatches > 0
      ? calculatePercentageChange(
          Object.values(analytics.batchesByStatus).reduce((sum, count) => sum + count, 0),
          analytics.previousPeriod.totalBatches
        )
      : null,
    [analytics?.previousPeriod, analytics?.batchesByStatus]
  )

  // Memoize chart data preparation
  const statusChartData = useMemo(() => 
    analytics ? Object.entries(analytics.batchesByStatus)
      .filter(([status]) => !selectedStatus || selectedStatus === status)
      .map(([status, count]) => ({
        name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
        fill: STATUS_COLORS[status] || CHART_COLORS.primary,
      }))
      .filter(item => item.value > 0) : [],
    [analytics?.batchesByStatus, selectedStatus]
  )

  const modelChartData = useMemo(() => 
    analytics ? Object.entries(analytics.tokenStats.modelBreakdown)
      .filter(([model]) => !selectedModel || selectedModel === model)
      .filter(([, stats]) => (stats.input + stats.output) > 0)
      .sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output))
      .map(([model, stats]) => ({
        name: formatModelNameForDisplay(model),
        input: stats.input,
        output: stats.output,
        total: stats.input + stats.output,
      })) : [],
    [analytics?.tokenStats.modelBreakdown, selectedModel]
  )

  const activityChartData = useMemo(() => 
    analytics ? analytics.recentActivity.map((activity) => {
      const date = new Date(activity.date)
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        batches: activity.batches,
        rows: activity.rows,
        inputTokens: activity.inputTokens,
        outputTokens: activity.outputTokens,
      }
    }) : [],
    [analytics?.recentActivity]
  )

  const tokenActivityChartData = useMemo(() => 
    analytics ? analytics.recentActivity.map((activity) => {
      const date = new Date(activity.date)
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        input: activity.inputTokens,
        output: activity.outputTokens,
      }
    }) : [],
    [analytics?.recentActivity]
  )

  // Calculate trend for Token Usage Over Time
  const tokenTrend = useMemo(() => {
    if (!tokenActivityChartData || tokenActivityChartData.length < 2) return null
    const recent = tokenActivityChartData.slice(-7)
    const previous = tokenActivityChartData.slice(-14, -7)
    if (previous.length === 0) return null
    
    const recentTotal = recent.reduce((sum, d) => sum + d.input + d.output, 0)
    const previousTotal = previous.reduce((sum, d) => sum + d.input + d.output, 0)
    
    if (previousTotal === 0) return null
    
    const changePercent = ((recentTotal - previousTotal) / previousTotal) * 100
    return {
      percent: Math.abs(changePercent),
      isIncrease: changePercent > 0,
    }
  }, [tokenActivityChartData])

  // Export handlers - MUST be before early returns
  const handleExportChart = useCallback(async (chartId: string, chartName: string) => {
    setExportingChart(chartId)
    try {
      let chartElement: HTMLElement | null = null
      
      switch (chartId) {
        case 'token-usage-over-time':
          chartElement = tokenUsageChartRef.current
          break
        case 'batch-status':
          chartElement = batchStatusChartRef.current
          break
        case 'model-breakdown':
          chartElement = modelBreakdownChartRef.current
          break
        case 'recent-activity':
          chartElement = recentActivityChartRef.current
          break
      }

      if (!chartElement) {
        throw new Error('Chart element not found')
      }

      // Try to find SVG first (for recharts)
      const svg = findChartSVG(chartElement)
      if (svg) {
        await exportSVGAsPNG(svg, `${chartName}-${dateRange}-${new Date().toISOString().split('T')[0]}`)
      } else {
        await exportElementAsPNG(chartElement, `${chartName}-${dateRange}-${new Date().toISOString().split('T')[0]}`)
      }

      toast.success('Chart exported successfully', {
        description: `Downloaded ${chartName}.png`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export chart', {
        description: error instanceof Error ? error.message : 'An error occurred',
      })
    } finally {
      setExportingChart(null)
    }
  }, [dateRange])

  const handleExportDashboard = useCallback(async () => {
    setExportingDashboard(true)
    if (!dashboardRef.current) return
    
    setExportingChart('dashboard')
    try {
      await exportDashboardAsPDF(
        dashboardRef.current,
        `analytics-dashboard-${dateRange}-${new Date().toISOString().split('T')[0]}`
      )
      toast.success('Dashboard exported successfully', {
        description: 'Downloaded analytics dashboard PDF',
      })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export dashboard', {
        description: error instanceof Error ? error.message : 'An error occurred',
      })
    } finally {
      setExportingChart(null)
      setExportingDashboard(false)
    }
  }, [dateRange])

  // Assign export handler to ref for keyboard shortcuts
  useEffect(() => {
    handleExportDashboardRef.current = handleExportDashboard
  }, [handleExportDashboard])

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading analytics">
        <div className="flex items-center justify-center py-12">
          <div className="text-xs text-muted-foreground">
            {retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Loading analytics...'}
          </div>
        </div>
        {/* Skeleton loaders for charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 xs:gap-4 sm:gap-5 md:gap-6 lg:gap-7 xl:gap-8">
          <div className="bg-card border border-border rounded-lg shadow-sm p-5 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-3" />
            <div className="h-20 bg-muted/50 rounded" />
          </div>
          <div className="bg-card border border-border rounded-lg shadow-sm p-5 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-3" />
            <div className="h-20 bg-muted/50 rounded" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg shadow-sm p-5 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-3" />
          <div className="h-48 bg-muted/50 rounded" />
        </div>
      </div>
    )
  }

  if (error && retryCount >= 3) {
    return (
      <ErrorBoundary>
        <div role="alert" aria-live="assertive">
          <ErrorState
            error={error}
            onRetry={handleRetry}
            title="Failed to load analytics"
            description={error}
            showRetry={true}
            variant="default"
          />
        </div>
      </ErrorBoundary>
    )
  }

  // Show comprehensive empty state if no data at all
  if (!analytics || (analytics?.tokenStats?.totalTokens === 0 && Object.keys(analytics?.batchesByStatus || {}).length === 0)) {
    return (
      <div className="space-y-4">
        {/* Header */}
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-4 sm:gap-5 md:gap-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Analytics Dashboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Track your usage and optimize costs</p>
          </div>
          <div className="flex items-center gap-2 w-full xs:w-auto">
            <Select 
              value={typeof dateRange === 'string' ? dateRange : 'custom'} 
              onValueChange={(value) => {
                if (value === 'custom') return
                setDateRange(value as DateRangePreset)
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full xs:w-[140px] sm:w-[160px] md:w-[180px] h-8 xs:h-9 sm:h-10 text-xs xs:text-sm">
                <Calendar className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comprehensive Empty State */}
        <EmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description="Process your first batch to start tracking usage, costs, and performance insights. Analytics will appear here automatically after your first batch completes."
          action={{
            label: 'Go to Bulk Processor',
            onClick: () => router.push('/bulk'),
          }}
          secondaryAction={{
            label: 'View Agents',
            onClick: () => router.push('/agents'),
          }}
          size="lg"
        >
          <div className="mt-6 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 xs:gap-4 sm:gap-5 md:gap-6 max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-4xl">
            <div className="text-center p-4 bg-secondary/30 border border-border rounded-md">
              <Zap className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-foreground mb-1">Track Usage</p>
              <p className="text-[10px] text-muted-foreground">Monitor token consumption and costs</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 border border-border rounded-md">
              <TrendingUp className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-foreground mb-1">View Trends</p>
              <p className="text-[10px] text-muted-foreground">See usage patterns over time</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 border border-border rounded-md">
              <Lightbulb className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-foreground mb-1">Get Insights</p>
              <p className="text-[10px] text-muted-foreground">Receive cost optimization tips</p>
            </div>
          </div>
        </EmptyState>
      </div>
    )
  }

  return (
    <>
      <ErrorBoundary>
        <TooltipProvider>
        <div ref={dashboardRef} className="space-y-6" role="main" aria-label="Analytics Dashboard">
          {/* Skip to main content link for screen readers */}
          <a 
            href="#analytics-main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Skip to main content"
          >
            Skip to main content
          </a>
          
          {/* Header with Quick Actions */}
          <header className="space-y-4 pb-4 border-b border-border/50">
            {/* Title and Description Row */}
            <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-3 xs:gap-4 sm:gap-5 md:gap-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-foreground mb-1">Analytics Dashboard</h1>
                <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3 sm:gap-4 md:gap-5">
                  <p className="text-sm text-muted-foreground">Track your usage and optimize costs</p>
                  {lastRefreshTime && (
                    <span className="text-xs text-muted-foreground/70" aria-live="polite">
                      Last updated: {format(lastRefreshTime, 'HH:mm:ss')}
                    </span>
                  )}
                </div>
              </div>
              {/* Primary Actions - Export */}
              {analytics && analytics.tokenStats.totalTokens > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                        title="Export data (Ctrl/Cmd + Shift + C for CSV, Ctrl/Cmd + Shift + J for JSON)"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Export
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => {
                            exportAnalyticsSummaryCSV(analytics, dateRange, {
                              includeFilters: true,
                            })
                            toast.success('CSV exported successfully')
                          }}
                        >
                          <FileText className="h-3 w-3 mr-2" />
                          Export CSV
                          <span className="ml-auto text-[10px] text-muted-foreground">⇧⌘C</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => {
                            exportAnalyticsJSON(analytics, dateRange, {
                              model: selectedModel,
                              status: selectedStatus,
                            }, {
                              includeFilters: true,
                            })
                            toast.success('JSON exported successfully')
                          }}
                        >
                          <FileText className="h-3 w-3 mr-2" />
                          Export JSON
                          <span className="ml-auto text-[10px] text-muted-foreground">⇧⌘J</span>
                        </Button>
                        {tokenActivityChartData.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-xs"
                            onClick={() => {
                              exportTokenActivityCSV(tokenActivityChartData)
                              toast.success('Token activity CSV exported')
                            }}
                          >
                            <BarChart3 className="h-3 w-3 mr-2" />
                            Token Activity CSV
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportDashboard}
                    disabled={exportingDashboard}
                    className="h-9 text-xs"
                    title="Export dashboard as PDF (Ctrl/Cmd + Shift + P)"
                  >
                    {exportingDashboard ? (
                      <Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    PDF
                  </Button>
                </div>
              )}
            </div>
            
            {/* Filters and Controls Row - Reorganized */}
            <div className="flex flex-col gap-3">
              {/* Primary Filters Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Date Range - Most Important */}
                <DateRangePicker
                  value={typeof dateRange === 'string' ? dateRange : dateRange}
                  onChange={(range) => setDateRange(range as DateRange)}
                />
                
                {/* Model Filter */}
                {analytics && Object.keys(analytics.tokenStats.modelBreakdown).length > 1 && (
                  <Select
                    value={selectedModel || 'all'}
                    onValueChange={(value) => {
                      setSelectedModel(value === 'all' ? null : value)
                    }}
                  >
                    <SelectTrigger className="w-full xs:w-[160px] sm:w-[180px] md:w-[200px] h-9 xs:h-10 sm:h-11 text-xs xs:text-sm">
                      <Zap className="h-3.5 w-3.5 mr-1.5" />
                      <SelectValue placeholder="All models" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All models</SelectItem>
                      {Object.keys(analytics.tokenStats.modelBreakdown)
                        .filter(model => {
                          const stats = analytics.tokenStats.modelBreakdown[model]
                          return stats.input + stats.output > 0
                        })
                        .map((model) => (
                          <SelectItem key={model} value={model}>
                            {formatModelNameForDisplay(model)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                
                {/* Status Filter */}
                {analytics && Object.keys(analytics.batchesByStatus).length > 1 && (
                  <Select
                    value={selectedStatus || 'all'}
                    onValueChange={(value) => {
                      setSelectedStatus(value === 'all' ? null : value)
                    }}
                  >
                    <SelectTrigger className="w-full xs:w-[140px] sm:w-[160px] md:w-[180px] h-9 xs:h-10 sm:h-11 text-xs xs:text-sm">
                      <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {Object.entries(analytics.batchesByStatus)
                        .filter(([, count]) => count > 0)
                        .map(([status]) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {/* Secondary Controls Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Refresh Controls Group */}
                <div className="flex items-center gap-1 border-r border-border/50 pr-2 mr-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newValue = !autoRefresh
                      setAutoRefresh(newValue)
                      updatePreferences({ autoRefresh: newValue })
                    }}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title={autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
                    aria-label={autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
                  >
                    {autoRefresh ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isLoading}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Refresh data"
                    aria-label="Refresh analytics data"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  
                  {!isMobile && (
                    <Select
                      value={refreshInterval.toString()}
                      onValueChange={(value) => {
                        const interval = parseInt(value, 10)
                        setRefreshInterval(interval)
                        updatePreferences({ refreshInterval: interval })
                      }}
                    >
                      <SelectTrigger className="w-[90px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15000">15s</SelectItem>
                        <SelectItem value="30000">30s</SelectItem>
                        <SelectItem value="60000">1m</SelectItem>
                        <SelectItem value="300000">5m</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                {/* Comparison Mode */}
                {analytics?.previousPeriod && (
                  <Button
                    variant={comparisonMode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setComparisonMode(!comparisonMode)}
                    className="h-8 px-2 text-xs"
                    title={comparisonMode ? 'Exit comparison mode' : 'Compare with previous period'}
                    aria-label={comparisonMode ? 'Exit comparison mode' : 'Compare with previous period'}
                  >
                    <GitCompare className="h-3.5 w-3.5 mr-1.5" />
                    {!isMobile && <span>Compare</span>}
                  </Button>
                )}
                
                {/* More Options Menu */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      title="More options"
                      aria-label="More options"
                    >
                      <Filter className="h-3.5 w-3.5 mr-1.5" />
                      {!isMobile && <span>More</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      {/* Filter Presets */}
                      <Popover open={showFilterPresets} onOpenChange={setShowFilterPresets}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-xs"
                          >
                            <Bookmark className="h-3 w-3 mr-2" />
                            Saved Filters
                            {presets.length > 0 && (
                              <span className="ml-auto text-[10px] text-muted-foreground">{presets.length}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="start">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold">Saved Filters</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowSaveFilterDialog(true)
                                  setShowFilterPresets(false)
                                }}
                                className="h-6 px-2 text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </div>
                            
                            {presets.length === 0 ? (
                              <div className="text-xs text-muted-foreground py-4 text-center">
                                No saved filters yet
                              </div>
                            ) : (
                              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {presets.map((preset) => (
                                  <div
                                    key={preset.id}
                                    className={`flex items-center justify-between p-2 rounded-md hover:bg-secondary cursor-pointer ${
                                      currentMatchingPreset?.id === preset.id ? 'bg-primary/10 border border-primary/20' : ''
                                    }`}
                                    onClick={() => applyPreset(preset)}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate">{preset.name}</div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5">
                                        {preset.filters.model && `Model: ${formatModelNameForDisplay(preset.filters.model)}`}
                                        {preset.filters.status && ` • Status: ${preset.filters.status}`}
                                        {typeof preset.filters.dateRange === 'string' && ` • ${preset.filters.dateRange}`}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deletePreset(preset.id)
                                        toast.success('Filter preset deleted')
                                      }}
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                      aria-label={`Delete ${preset.name}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Keyboard Shortcuts */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowKeyboardShortcuts(true)}
                        className="w-full justify-start h-8 text-xs"
                      >
                        <HelpCircle className="h-3 w-3 mr-2" />
                        Keyboard Shortcuts
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </header>
          
          {/* Save Filter Dialog - Outside header */}
          {showSaveFilterDialog && (
            <Popover open={showSaveFilterDialog} onOpenChange={setShowSaveFilterDialog}>
              <PopoverTrigger asChild>
                <div className="hidden" />
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Save Filter Preset</h4>
                    <p className="text-xs text-muted-foreground">
                      Save your current filter settings for quick access
                    </p>
                  </div>
                  
                  <Input
                    placeholder="Preset name (e.g., 'Gemini Pro Only')"
                    value={filterPresetName}
                    onChange={(e) => setFilterPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSavePreset()
                      }
                    }}
                    className="h-8 text-xs"
                    autoFocus
                  />
                  
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowSaveFilterDialog(false)
                        setFilterPresetName('')
                      }}
                      className="h-7 px-3 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePreset}
                      disabled={!filterPresetName.trim()}
                      className="h-7 px-3 text-xs"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

      {/* Usage & Limits - Priority: Show first */}
      {analytics && (
        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Usage & Limits</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/agents')}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLinkIcon className="h-3 w-3 mr-1" />
                View Batches
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/profile')}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                View Profile
                <ExternalLinkIcon className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <UsageDisplay />
        </div>
      )}

      {/* Overview Stats - Token Usage Summary */}
      {isLoading && !analytics ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Loading analytics...</span>
          </div>
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Comparison Mode: Show side-by-side comparison */}
        {comparisonMode && analytics.previousPeriod ? (
          <>
            <ComparisonWidget
              title="Token Usage"
              icon={Zap}
              current={{
                label: 'Current Period',
                value: analytics.tokenStats.totalTokens,
                formatValue: (value: string | number) => formatNumber(Number(value)),
              }}
              previous={{
                label: 'Previous Period',
                value: analytics.previousPeriod.tokenStats.totalTokens,
                formatValue: (value: string | number) => formatNumber(Number(value)),
              }}
              comparison={tokenComparison}
              isMobile={isMobile}
            />
            <ComparisonWidget
              title="Estimated Cost"
              icon={BarChart3}
              current={{
                label: 'Current Period',
                value: totalCost,
                formatValue: (value: string | number) => formatCost(Number(value)),
              }}
              previous={{
                label: 'Previous Period',
                value: previousTotalCost,
                formatValue: (value: string | number) => formatCost(Number(value)),
              }}
              comparison={costComparison}
              isMobile={isMobile}
            />
            {batchesComparison && (
              <ComparisonWidget
                title="Total Batches"
                icon={Activity}
                current={{
                  label: 'Current Period',
                  value: Object.values(analytics.batchesByStatus).reduce((sum, count) => sum + count, 0),
                }}
                previous={{
                  label: 'Previous Period',
                  value: analytics.previousPeriod.totalBatches,
                }}
                comparison={batchesComparison}
                isMobile={isMobile}
              />
            )}
          </>
        ) : (
          <>
            {/* Token Usage Summary - Enhanced with prominent cost display */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Token Usage</h3>
                </div>
            {analytics.tokenStats.totalTokens > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/analytics?tab=executions')}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                View Details
                <ExternalLinkIcon className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
          {analytics.tokenStats.totalTokens > 0 ? (
            <div className="space-y-3">
              <div className={`grid grid-cols-3 gap-2 ${isMobile ? 'gap-3' : ''}`}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="text-xs text-muted-foreground">Input</span>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium mb-1">Input Tokens</p>
                        <p className="text-xs">The text you send to the AI model. Includes your prompt, CSV data, and context variables.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatNumber(analytics.tokenStats.totalInputTokens)}
                  </div>
                  {analytics.previousPeriod && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {(() => {
                        const comp = calculatePercentageChange(
                          analytics.tokenStats.totalInputTokens,
                          analytics.previousPeriod.tokenStats.totalInputTokens
                        )
                        return comp && comp.percent > 0.1 ? (
                          <span className={comp.isIncrease ? 'text-amber-400' : 'text-green-400'}>
                            {comp.isIncrease ? '↑' : '↓'} {comp.percent.toFixed(0)}%
                          </span>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="text-xs text-muted-foreground">Output</span>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-medium mb-1">Output Tokens</p>
                          <p className="text-xs">The text the AI model generates in response. This is what you receive as results.</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatNumber(analytics.tokenStats.totalOutputTokens)}
                  </div>
                  {analytics.previousPeriod && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {(() => {
                        const comp = calculatePercentageChange(
                          analytics.tokenStats.totalOutputTokens,
                          analytics.previousPeriod.tokenStats.totalOutputTokens
                        )
                        return comp && comp.percent > 0.1 ? (
                          <span className={comp.isIncrease ? 'text-amber-400' : 'text-green-400'}>
                            {comp.isIncrease ? '↑' : '↓'} {comp.percent.toFixed(0)}%
                          </span>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Total</div>
                  <div className="text-sm font-semibold text-primary">
                    {formatNumber(analytics.tokenStats.totalTokens)}
                  </div>
                  {tokenComparison && tokenComparison.percent > 0.1 && (
                    <div className={`text-[10px] mt-0.5 flex items-center justify-center gap-0.5 ${
                      tokenComparison.isIncrease ? 'text-amber-400' : 'text-green-400'
                    }`}>
                      {tokenComparison.isIncrease ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{tokenComparison.percent.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Cost Estimate */}
              {totalCost > 0 && (() => {
                const totalBatches = Object.values(analytics.tokenStats.modelBreakdown).reduce((sum, stats) => sum + stats.batches, 0)
                const totalRows = analytics.recentActivity.reduce((sum, d) => sum + d.rows, 0)
                const costPerBatch = calculateCostPerBatch(totalCost, totalBatches)
                const costPerRow = calculateCostPerRow(totalCost, totalRows)
                const potentialSavings = calculatePotentialSavings(analytics.tokenStats.modelBreakdown)
                
                return (
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Estimated Cost</span>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium mb-1">Estimated Cost</p>
                            <p className="text-xs">Approximate cost based on current model pricing. Actual costs may vary slightly.</p>
                          </TooltipContent>
                        </UITooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCost(totalCost)}
                        </span>
                        {costComparison && costComparison.percent > 0.1 && (
                          <span className={`text-[10px] flex items-center gap-0.5 ${
                            costComparison.isIncrease ? 'text-amber-400' : 'text-green-400'
                          }`}>
                            {costComparison.isIncrease ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {costComparison.percent.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Cost Breakdown */}
                    {(costPerBatch > 0 || costPerRow > 0) && (
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                        {costPerBatch > 0 && (
                          <div>
                            <span className="text-muted-foreground/70">Per batch:</span>{' '}
                            <span className="text-foreground font-medium">{formatCost(costPerBatch)}</span>
                          </div>
                        )}
                        {costPerRow > 0 && (
                          <div>
                            <span className="text-muted-foreground/70">Per row:</span>{' '}
                            <span className="text-foreground font-medium">{formatCost(costPerRow)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Potential Savings */}
                    {potentialSavings && potentialSavings.savings > 0.01 && (
                      <div className="pt-1 border-t border-border/30">
                        <div className="flex items-start gap-1.5 text-[10px]">
                          <Lightbulb className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-blue-400 font-medium mb-0.5">
                              Potential savings: {formatCost(potentialSavings.savings)} ({potentialSavings.savingsPercent.toFixed(0)}%)
                            </p>
                            <p className="text-muted-foreground/70">
                              Switch to Flash model to reduce costs while maintaining performance
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {totalCost > 0.1 && !potentialSavings && (
                      <p className="text-[10px] text-muted-foreground">
                        Based on current model pricing
                        {costComparison && costComparison.percent > 0.1 && (
                          <span className="ml-1">
                            {costComparison.isIncrease ? '↑' : '↓'} vs previous period
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )
              })()}
              
              {/* Model Breakdown */}
              {Object.keys(analytics.tokenStats.modelBreakdown).length > 0 && !comparisonMode && (
                <div className="pt-2 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2">By Model</div>
                  <div className="space-y-1.5">
                    {Object.entries(analytics.tokenStats.modelBreakdown)
                      .filter(([, stats]) => (stats.input + stats.output) > 0)
                      .sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output))
                      .map(([model, stats]) => {
                        const modelTotal = stats.input + stats.output
                        const percentage = analytics.tokenStats.totalTokens > 0 
                          ? (modelTotal / analytics.tokenStats.totalTokens) * 100
                          : 0
                        // Format percentage - use whole numbers when possible
                        const modelPercentage = percentage % 1 === 0 
                          ? Math.round(percentage).toString() 
                          : percentage.toFixed(1)
                        const modelCost = calculateCost(model, { input: stats.input, output: stats.output })
                        return (
                          <div key={model} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground/80 truncate flex-1 mr-2">
                              {formatModelNameForDisplay(model)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-foreground font-medium">
                                {formatNumber(modelTotal)}
                              </span>
                              <span className="text-muted-foreground/60 text-[10px]">
                                ({modelPercentage}%)
                              </span>
                              <span className="text-muted-foreground/70 text-[10px]">
                                {formatCost(modelCost)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Zap}
              title="No token usage data yet"
              description="Process your first batch to see token usage statistics and cost estimates"
              action={{
                label: 'Go to Agents',
                onClick: () => router.push('/agents'),
              }}
              size="sm"
            >
              <div className="mt-3 text-xs text-muted-foreground">
                <p>💡 Token usage helps you track costs and optimize your AI processing</p>
              </div>
            </EmptyState>
          )}
        </div>
          </>
        )}
        </div>
      ) : null}

      {/* Insights Panel - Show after Token Usage */}
      {analytics && (
        <InsightsPanel 
          tokenStats={analytics.tokenStats}
          recentActivity={analytics.recentActivity}
          previousPeriod={analytics.previousPeriod}
          dateRange={typeof dateRange === 'string' ? dateRange : 'all'}
        />
      )}
          
          {/* Main content area - Charts */}
          <div id="analytics-main-content" className="space-y-6" aria-label="Analytics content">
            {/* Inline error message during retries */}
            {error && retryCount < 3 && (
              <ErrorState
                error={error}
                onRetry={handleRetry}
                title="Error loading data"
                description={`${error}. Retrying automatically... (${retryCount}/3)`}
                showRetry={true}
                variant="inline"
              />
            )}
            
            {/* Token Usage Over Time */}
            {isLoading && !analytics ? (
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <ChartSkeleton height={isMobile ? 280 : isTablet ? 320 : 350} showHeader={true} />
        </div>
      ) : analytics && tokenActivityChartData.length > 0 && tokenActivityChartData.some(d => d.input + d.output > 0) ? (
        <div ref={tokenUsageChartRef} className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Token Usage Over Time</h3>
            </div>
            <div className="flex items-center gap-2">
              {tokenTrend && (
                <div className={`flex items-center gap-1 text-xs ${tokenTrend.isIncrease ? 'text-amber-400' : 'text-green-400'}`}>
                  {tokenTrend.isIncrease ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{tokenTrend.isIncrease ? 'Up' : 'Down'} {tokenTrend.percent.toFixed(0)}%</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedChart('token-usage-over-time')
                }}
                className={`${isMobile ? 'h-8 px-3' : 'h-6 px-2'} text-xs text-muted-foreground hover:text-foreground`}
                title="Expand chart to full screen"
                aria-label="Expand Token Usage Over Time chart to full screen"
              >
                <Maximize2 className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExportChart('token-usage-over-time', 'token-usage-over-time')
                }}
                disabled={exportingChart === 'token-usage-over-time'}
                className={`${isMobile ? 'h-8 px-3' : 'h-6 px-2'} text-xs text-muted-foreground hover:text-foreground`}
                title="Export chart as PNG"
                aria-label="Export Token Usage Over Time chart as PNG"
              >
                {exportingChart === 'token-usage-over-time' ? (
                  <Clock className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} animate-spin`} />
                ) : (
                  <ImageIcon className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                )}
              </Button>
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/analytics?tab=executions')}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  View Details
                  <ExternalLinkIcon className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
          <div 
            className="cursor-pointer transition-opacity hover:opacity-90" 
            onClick={() => setExpandedChart('token-usage-over-time')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setExpandedChart('token-usage-over-time')
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Expand Token Usage Over Time chart"
          >
            <ResponsiveContainer width="100%" height={isMobile ? 280 : isTablet ? 320 : 350}>
              {(() => {
                // Calculate annotations - use 'value' key to calculate total (input + output)
                // We'll create a modified dataset with total values
                const chartDataWithTotal = tokenActivityChartData.map(d => ({
                  ...d,
                  value: (d.input || 0) + (d.output || 0)
                }))
                const peakMarker = findPeakUsage(chartDataWithTotal, 'value')
                const avgValue = calculateAverage(chartDataWithTotal, 'value')
                
                // Find peak data point for reference line
                const peakDataPoint = peakMarker 
                  ? tokenActivityChartData.find(d => d.date === peakMarker.date)
                  : null
                const peakTotal = peakDataPoint 
                  ? (peakDataPoint.input || 0) + (peakDataPoint.output || 0)
                  : null
                
                return (
                  <LineChart 
                    data={tokenActivityChartData}
                    aria-label="Token usage over time chart showing input and output tokens"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '11px' }}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '11px' }}
                      tickFormatter={(value: string | number) => formatNumber(Number(value))}
                      tickLine={false}
                    />
                    <Tooltip 
                      content={<CustomTooltip formatter={formatNumber} />}
                      wrapperStyle={{ outline: 'none' }}
                      cursor={false}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    
                    {/* Average line */}
                    {avgValue > 0 && tokenActivityChartData.length > 1 && (
                      <ReferenceLine 
                        y={avgValue} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="2 2"
                        opacity={0.5}
                        strokeWidth={1}
                      >
                        <Label 
                          value="Avg" 
                          position="right" 
                          style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }}
                        />
                      </ReferenceLine>
                    )}
                    
                    {/* Peak marker */}
                    {peakMarker && peakTotal && (
                      <ReferenceLine 
                        x={peakMarker.date}
                        stroke={CHART_COLORS.warning}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                      >
                        <Label 
                          value={`Peak: ${formatNumber(peakTotal)}`}
                          position="top"
                          style={{ 
                            fontSize: '10px', 
                            fill: CHART_COLORS.warning,
                            fontWeight: '500'
                          }}
                        />
                      </ReferenceLine>
                    )}
                    
                    <Line 
                      type="monotone" 
                      dataKey="input" 
                      stroke={CHART_COLORS.primary} 
                      strokeWidth={2}
                      name="Input"
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="output" 
                      stroke={CHART_COLORS.secondary} 
                      strokeWidth={2}
                      name="Output"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                )
              })()}
            </ResponsiveContainer>
          </div>
        </div>
      ) : tokenActivityChartData.length > 0 ? (
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Token Usage Over Time</h3>
          </div>
          <EmptyState
            icon={TrendingUp}
            title="No token usage data over time yet"
            description="Process batches to see usage trends and identify patterns"
            action={{
              label: 'Go to Agents',
              onClick: () => router.push('/agents'),
            }}
            size="sm"
          >
            <div className="mt-3 text-xs text-muted-foreground">
              <p>💡 Track your usage patterns to optimize costs and performance</p>
            </div>
          </EmptyState>
        </div>
      ) : null}

      {/* Batch Status Distribution */}
      {isLoading && !analytics ? (
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <ChartSkeleton height={isMobile ? 280 : isTablet ? 320 : 350} showHeader={true} />
        </div>
      ) : analytics && statusChartData.length > 0 && statusChartData.some(d => d.value > 0) ? (
        <div ref={batchStatusChartRef} className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Batch Status</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedChart('batch-status')
                }}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Expand chart to full screen"
                aria-label="Expand Batch Status chart to full screen"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExportChart('batch-status', 'batch-status')
                }}
                disabled={exportingChart === 'batch-status'}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Export chart as PNG"
                aria-label="Export Batch Status chart as PNG"
              >
                {exportingChart === 'batch-status' ? (
                  <Clock className="h-3 w-3 animate-spin" />
                ) : (
                  <ImageIcon className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/analytics?tab=executions')}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                View All
                <ExternalLinkIcon className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <div 
            className="cursor-pointer transition-opacity hover:opacity-90" 
            onClick={() => setExpandedChart('batch-status')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setExpandedChart('batch-status')
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Expand Batch Status chart"
          >
            <ResponsiveContainer width="100%" height={isMobile ? 280 : isTablet ? 320 : 350}>
              <BarChart 
                data={statusChartData}
                aria-label="Batch status distribution chart showing completed, failed, and processing batches"
                onClick={(data: { activePayload?: Array<{ payload: Record<string, unknown> }> }) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    handleChartClick(data.activePayload[0].payload as { name?: string }, 'status')
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ outline: 'none' }}
                  cursor="pointer"
                />
                <Bar 
                  dataKey="value" 
                  fill={CHART_COLORS.primary} 
                  radius={[4, 4, 0, 0]}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : statusChartData.length > 0 ? (
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Batch Status</h3>
          </div>
          <EmptyState
            icon={BarChart3}
            title="No batch data available yet"
            description="Process your first batch to see status distribution and success rates"
            action={{
              label: 'Go to Agents',
              onClick: () => router.push('/agents'),
            }}
            size="sm"
          >
            <div className="mt-3 text-xs text-muted-foreground">
              <p>💡 Monitor batch success rates to improve your prompts and workflows</p>
            </div>
          </EmptyState>
        </div>
      ) : null}

      {/* Model Breakdown - Only show if more than one model or adds value */}
      {isLoading && !analytics ? (
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <ChartSkeleton height={isMobile ? 280 : isTablet ? 320 : 350} showHeader={true} />
        </div>
      ) : analytics && modelChartData.length > 1 && modelChartData.some(d => d.total > 0) ? (
        <div ref={modelBreakdownChartRef} className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Model Breakdown</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedChart('model-breakdown')
                }}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Expand chart to full screen"
                aria-label="Expand Model Breakdown chart to full screen"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExportChart('model-breakdown', 'model-breakdown')
                }}
                disabled={exportingChart === 'model-breakdown'}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Export chart as PNG"
                aria-label="Export Model Breakdown chart as PNG"
              >
                {exportingChart === 'model-breakdown' ? (
                  <Clock className="h-3 w-3 animate-spin" />
                ) : (
                  <ImageIcon className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/analytics?tab=executions')}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                View Details
                <ExternalLinkIcon className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <div 
            className="cursor-pointer transition-opacity hover:opacity-90" 
            onClick={() => setExpandedChart('model-breakdown')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setExpandedChart('model-breakdown')
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Expand Model Breakdown chart"
          >
            <ResponsiveContainer width="100%" height={isMobile ? 280 : isTablet ? 320 : 350}>
              <BarChart 
                data={modelChartData} 
                layout="vertical"
                aria-label="Model breakdown chart showing token usage by model"
                onClick={(data: { activePayload?: Array<{ payload: Record<string, unknown> }> }) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    handleChartClick(data.activePayload[0].payload as { name?: string }, 'model')
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                  tickFormatter={(value: string | number) => formatNumber(Number(value))}
                  tickLine={false}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                  width={100}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={formatNumber} />}
                  wrapperStyle={{ outline: 'none' }}
                  cursor="pointer"
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Bar 
                  dataKey="input" 
                  stackId="a" 
                  fill={CHART_COLORS.primary} 
                  name="Input" 
                  radius={[0, 0, 0, 0]}
                  style={{ cursor: 'pointer' }}
                />
                <Bar 
                  dataKey="output" 
                  stackId="a" 
                  fill={CHART_COLORS.secondary} 
                  name="Output" 
                  radius={[4, 4, 0, 0]}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : modelChartData.length > 0 ? (
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Model Breakdown</h3>
          </div>
          <EmptyState
            icon={Zap}
            title="No model usage data available yet"
            description="Process batches to see which models you're using and optimize costs"
            action={{
              label: 'Go to Agents',
              onClick: () => router.push('/agents'),
            }}
            size="sm"
          >
            <div className="mt-3 text-xs text-muted-foreground">
              <p>💡 Compare model usage to find cost-saving opportunities</p>
            </div>
          </EmptyState>
        </div>
      ) : null}

      {/* Recent Activity */}
      {analytics && activityChartData.length > 0 && (
        <div ref={recentActivityChartRef} className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recent Activity</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedChart('recent-activity')
                }}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Expand chart to full screen"
                aria-label="Expand Recent Activity chart to full screen"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExportChart('recent-activity', 'recent-activity')
                }}
                disabled={exportingChart === 'recent-activity'}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Export chart as PNG"
                aria-label="Export Recent Activity chart as PNG"
              >
                {exportingChart === 'recent-activity' ? (
                  <Clock className="h-3 w-3 animate-spin" />
                ) : (
                  <ImageIcon className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/analytics?tab=executions')}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                View All
                <ExternalLinkIcon className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <div 
            className="cursor-pointer transition-opacity hover:opacity-90" 
            onClick={() => setExpandedChart('recent-activity')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setExpandedChart('recent-activity')
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Expand Recent Activity chart"
          >
            <ResponsiveContainer width="100%" height={isMobile ? 280 : isTablet ? 320 : 350}>
              <BarChart data={activityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ outline: 'none' }}
                  cursor={false}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Bar dataKey="batches" fill={CHART_COLORS.primary} name="Batches" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rows" fill={CHART_COLORS.secondary} name="Rows" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Chart Modals */}
      {/* Token Usage Over Time Modal */}
      <ChartModal
        isOpen={expandedChart === 'token-usage-over-time'}
        onClose={() => setExpandedChart(null)}
        title="Token Usage Over Time"
        icon={TrendingUp}
        chartRef={expandedTokenUsageRef}
        dateRange={typeof dateRange === 'string' ? dateRange : undefined}
      >
        {analytics && tokenActivityChartData.length > 0 && (() => {
          // Calculate annotations for expanded chart - use 'value' key to calculate total (input + output)
          const chartDataWithTotal = tokenActivityChartData.map(d => ({
            ...d,
            value: (d.input || 0) + (d.output || 0)
          }))
          const peakMarker = findPeakUsage(chartDataWithTotal, 'value')
          const avgValue = calculateAverage(chartDataWithTotal, 'value')
          const peakDataPoint = peakMarker 
            ? tokenActivityChartData.find(d => d.date === peakMarker.date)
            : null
          const peakTotal = peakDataPoint 
            ? (peakDataPoint.input || 0) + (peakDataPoint.output || 0)
            : null
          
          return (
            <ResponsiveContainer width="100%" height={isMobile ? 450 : isTablet ? 550 : 600}>
              <LineChart data={tokenActivityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value: string | number) => formatNumber(Number(value))}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={formatNumber} />}
                  wrapperStyle={{ outline: 'none' }}
                  cursor={false}
                />
                <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '16px' }} />
                
                {/* Average line */}
                {avgValue > 0 && tokenActivityChartData.length > 1 && (
                  <ReferenceLine 
                    y={avgValue} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="2 2"
                    opacity={0.5}
                    strokeWidth={1}
                  >
                    <Label 
                      value="Avg" 
                      position="right" 
                      style={{ fontSize: '11px', fill: 'hsl(var(--muted-foreground))' }}
                    />
                  </ReferenceLine>
                )}
                
                {/* Peak marker */}
                {peakMarker && peakTotal && (
                  <ReferenceLine 
                    x={peakMarker.date}
                    stroke={CHART_COLORS.warning}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  >
                    <Label 
                      value={`Peak: ${formatNumber(peakTotal)}`}
                      position="top"
                      style={{ 
                        fontSize: '11px', 
                        fill: CHART_COLORS.warning,
                        fontWeight: '500'
                      }}
                    />
                  </ReferenceLine>
                )}
                
                <Line 
                  type="monotone" 
                  dataKey="input" 
                  stroke={CHART_COLORS.primary} 
                  strokeWidth={3}
                  name="Input"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="output" 
                  stroke={CHART_COLORS.secondary} 
                  strokeWidth={3}
                  name="Output"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )
        })()}
      </ChartModal>

      {/* Batch Status Modal */}
      <ChartModal
        isOpen={expandedChart === 'batch-status'}
        onClose={() => setExpandedChart(null)}
        title="Batch Status Distribution"
        icon={BarChart3}
        chartRef={expandedBatchStatusRef}
        dateRange={typeof dateRange === 'string' ? dateRange : undefined}
      >
        {analytics && statusChartData.length > 0 && (
          <ResponsiveContainer width="100%" height={isMobile ? 400 : 600}>
            <BarChart 
              data={statusChartData}
                onClick={(data: { activePayload?: Array<{ payload: Record<string, unknown> }> }) => {
                if (data && data.activePayload && data.activePayload[0]) {
                    handleChartClick(data.activePayload[0].payload as { name?: string }, 'status')
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none' }}
                cursor="pointer"
              />
              <Bar 
                dataKey="value" 
                fill={CHART_COLORS.primary} 
                radius={[4, 4, 0, 0]}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartModal>

      {/* Model Breakdown Modal */}
      <ChartModal
        isOpen={expandedChart === 'model-breakdown'}
        onClose={() => setExpandedChart(null)}
        title="Model Breakdown"
        icon={Zap}
        chartRef={expandedModelBreakdownRef}
        dateRange={typeof dateRange === 'string' ? dateRange : undefined}
      >
        {analytics && modelChartData.length > 1 && (
          <ResponsiveContainer width="100%" height={isMobile ? 400 : 600}>
            <BarChart 
              data={modelChartData} 
              layout="vertical"
              onClick={(data: { activePayload?: Array<{ payload: Record<string, unknown> }> }) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  handleChartClick(data.activePayload[0].payload as { name?: string }, 'model')
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                type="number"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickFormatter={(value: string | number) => formatNumber(Number(value))}
                tickLine={false}
              />
              <YAxis 
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                width={120}
                tickLine={false}
              />
              <Tooltip 
                content={<CustomTooltip formatter={formatNumber} />}
                wrapperStyle={{ outline: 'none' }}
                cursor="pointer"
              />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '16px' }} />
              <Bar 
                dataKey="input" 
                stackId="a" 
                fill={CHART_COLORS.primary} 
                name="Input" 
                radius={[0, 0, 0, 0]}
                style={{ cursor: 'pointer' }}
              />
              <Bar 
                dataKey="output" 
                stackId="a" 
                fill={CHART_COLORS.secondary} 
                name="Output" 
                radius={[4, 4, 0, 0]}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartModal>

      {/* Recent Activity Modal */}
      <ChartModal
        isOpen={expandedChart === 'recent-activity'}
        onClose={() => setExpandedChart(null)}
        title="Recent Activity"
        icon={Clock}
        chartRef={expandedRecentActivityRef}
        dateRange={typeof dateRange === 'string' ? dateRange : undefined}
      >
        {analytics && activityChartData.length > 0 && (
          <ResponsiveContainer width="100%" height={isMobile ? 400 : 600}>
            <BarChart data={activityChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none' }}
                cursor={false}
              />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '16px' }} />
              <Bar dataKey="batches" fill={CHART_COLORS.primary} name="Batches" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rows" fill={CHART_COLORS.secondary} name="Rows" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartModal>
          </div>
        </div>
        
        {/* Keyboard Shortcuts Modal */}
        <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription>
                Use these shortcuts to navigate and interact with the analytics dashboard faster
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              {/* Data Operations */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Operations</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-md">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Refresh data</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                      <span className="text-muted-foreground">+</span>
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">R</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Operations */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Export</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-md">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Export dashboard as PDF</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                      <span className="text-muted-foreground">+</span>
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">E</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-md">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Export CSV</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                      <span className="text-muted-foreground">+</span>
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">⇧</kbd>
                      <span className="text-muted-foreground">+</span>
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">C</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-md">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Export JSON</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                      <span className="text-muted-foreground">+</span>
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">⇧</kbd>
                      <span className="text-muted-foreground">+</span>
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">J</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Navigation</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-md">
                    <div className="flex items-center gap-3">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Open filter presets</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">⌘</kbd>
                      <span className="text-muted-foreground">+</span>
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">F</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-md">
                    <div className="flex items-center gap-3">
                      <X className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Close modals/popovers</span>
                    </div>
                    <kbd className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">Esc</kbd>
                  </div>
                </div>
              </div>

              {/* Help */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-md space-y-2">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary/90">Tip</p>
                    <p className="text-xs text-primary/70 leading-relaxed">
                      Press <kbd className="px-1.5 py-0.5 bg-background/50 border border-primary/30 rounded text-xs font-mono">⌘?</kbd> anytime to view this help dialog.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </TooltipProvider>
      </ErrorBoundary>
    </>
  )
}

// Export as default for dynamic imports
export default AnalyticsDashboard
