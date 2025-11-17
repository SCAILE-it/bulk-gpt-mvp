/**
 * ABOUTME: Dashboard page showing batch history and quick stats
 * ABOUTME: Displays recent batches, success rate, and links to wizard/profile
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Activity, Plus, TrendingUp, Download, Search, RefreshCw, AlertCircle, X, BarChart3, ArrowUp, ArrowDown, HelpCircle } from 'lucide-react'
import { logError } from '@/lib/errors'
import { toast } from 'sonner'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import dynamic from 'next/dynamic'
import { flattenBatchResultsForExport, exportToCSV, type BatchResultRow } from '@/lib/export'

// Lazy load heavy chart components for better initial load performance
const AnalyticsDashboard = dynamic(
  () => import('@/components/dashboard/AnalyticsDashboard'),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="text-xs text-muted-foreground">Loading analytics...</div>
      </div>
    ),
    ssr: false, // Charts don't need SSR
  }
)
import { generateExportFilenameFromBatch, generateExportFilename } from '@/lib/export-filename'
import { EmptyState } from '@/components/ui/empty-state'
import { PageWithTabs } from '@/components/layout/PageWithTabs'
import { DataErrorBoundary } from '@/components/ErrorBoundary'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadgeWrapper } from '@/components/integration/StatusBadgeWrapper'
import { TruncatedText } from '@/components/ui/truncated-text'
import { ProgressDisplay } from '@/components/integration/ProgressDisplay'
import { TableColumnToggle, type ColumnConfig } from '@/components/ui/table-column-toggle'

interface Batch {
  id: string
  csv_filename: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  total_rows: number
  processed_rows: number
  created_at: string
  updated_at: string
  total_input_tokens?: number
  total_output_tokens?: number
  model_used?: string
  scheduled_run_name?: string // Name of schedule if batch came from scheduled run
  is_scheduled?: boolean // Whether batch came from a scheduled run
}

interface DashboardStats {
  totalBatches: number
  completedBatches: number
  failedBatches: number
  successRate: number
}

export default function DashboardPage() {
  return (
    <DataErrorBoundary
      errorMessage="Failed to load dashboard data. Please check your connection and try again."
    >
      <DashboardPageContent />
    </DataErrorBoundary>
  )
}

function DashboardPageContent() {
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>([])
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Batch['status'] | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [stats, setStats] = useState<DashboardStats>({
    totalBatches: 0,
    completedBatches: 0,
    failedBatches: 0,
    successRate: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['filename', 'status', 'progress', 'model', 'created', 'actions'])

  useEffect(() => {
    async function fetchDashboardData() {
      const supabase = createClient()
      if (!supabase) {
        setError('Supabase client not configured')
        setIsLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }

        // Fetch recent batches (limit 10)
        const { data: batchesData, error: batchesError } = await supabase
          .from('batches')
          .select('id, csv_filename, status, total_rows, processed_rows, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (batchesError) throw batchesError

        // Fetch token usage and check if batches came from scheduled runs
        const batchesWithTokens = await Promise.all(
          (batchesData || []).map(async (batch) => {
            // Fetch token data
            const { data: tokenData } = await supabase
              .from('batch_results')
              .select('input_tokens, output_tokens, model')
              .eq('batch_id', batch.id)
              .limit(1000) // Reasonable limit for aggregation

            // Check if this batch came from a scheduled run
            // First check scheduled_run_executions (most accurate)
            let scheduledRun = null
            try {
              const { data: execution } = await supabase
                .from('scheduled_run_executions')
                .select('scheduled_run_id')
                .eq('batch_id', batch.id)
                .maybeSingle()
              
              if (execution?.scheduled_run_id) {
                const { data } = await supabase
                  .from('scheduled_runs')
                  .select('name')
                  .eq('id', execution.scheduled_run_id)
                  .eq('user_id', user.id)
                  .maybeSingle()
                scheduledRun = data
              } else {
                // Fallback: check scheduled_runs.last_run_batch_id
                const { data } = await supabase
                  .from('scheduled_runs')
                  .select('name')
                  .eq('user_id', user.id)
                  .eq('last_run_batch_id', batch.id)
                  .maybeSingle()
                scheduledRun = data
              }
            } catch (err) {
              // Ignore errors when checking scheduled runs - not critical
              console.debug('Error checking scheduled run:', err)
            }

            const totalInputTokens = tokenData?.reduce((sum, row) => sum + (row.input_tokens || 0), 0) || 0
            const totalOutputTokens = tokenData?.reduce((sum, row) => sum + (row.output_tokens || 0), 0) || 0
            const modelUsed = tokenData?.find(row => row.model)?.model

            return {
              ...batch,
              total_input_tokens: totalInputTokens,
              total_output_tokens: totalOutputTokens,
              model_used: modelUsed,
              is_scheduled: !!scheduledRun,
              scheduled_run_name: scheduledRun?.name,
            }
          })
        )

        setBatches(batchesWithTokens)

        // Calculate stats
        const { data: allBatches, error: statsError } = await supabase
          .from('batches')
          .select('status')
          .eq('user_id', user.id)

        if (statsError) throw statsError

        const total = allBatches?.length || 0
        const completed = allBatches?.filter(b => b.status === 'completed').length || 0
        const failed = allBatches?.filter(b => b.status === 'failed').length || 0
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

        setStats({
          totalBatches: total,
          completedBatches: completed,
          failedBatches: failed,
          successRate,
        })
      } catch (err) {
        logError(err instanceof Error ? err : new Error('Dashboard fetch failed'), {
          source: 'dashboard/fetchDashboardData'
        })
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [router])

  // Filter and sort batches
  useEffect(() => {
    let filtered = batches

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(batch =>
        batch.csv_filename.toLowerCase().includes(query) ||
        batch.status.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(batch => batch.status === statusFilter)
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'name':
          comparison = a.csv_filename.localeCompare(b.csv_filename)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredBatches(filtered)
  }, [searchQuery, statusFilter, sortBy, sortOrder, batches])

  // Keyboard shortcut for clearing search (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key clears search when focused on search input
      if (e.key === 'Escape' && e.target instanceof HTMLInputElement) {
        const input = e.target as HTMLInputElement
        if (input.getAttribute('aria-label') === 'Search batches by filename or status' && searchQuery) {
          e.preventDefault()
          setSearchQuery('')
          input.blur() // Remove focus after clearing
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  const downloadCSV = () => {
    try {
      const headers = ['Filename', 'Status', 'Total Rows', 'Processed Rows', 'Created At']
      const csvContent = [
        headers.join(','),
        ...filteredBatches.map(b => [
          `"${b.csv_filename}"`,
          b.status,
          b.total_rows,
          b.processed_rows,
          new Date(b.created_at).toLocaleString()
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batches-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success('Export Complete', {
        description: `Successfully exported ${filteredBatches.length} batch${filteredBatches.length !== 1 ? 'es' : ''} to CSV`
      })
    } catch (err) {
      toast.error('Export Failed', {
        description: 'An error occurred while exporting CSV. Please try again.'
      })
    }
  }

  const downloadJSON = () => {
    try {
      const jsonContent = JSON.stringify(filteredBatches, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batches-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success('Export Complete', {
        description: `Successfully exported ${filteredBatches.length} batch${filteredBatches.length !== 1 ? 'es' : ''} to JSON`
      })
    } catch (err) {
      toast.error('Export Failed', {
        description: 'An error occurred while exporting JSON. Please try again.'
      })
    }
  }

  const downloadBatchResults = async (batchId: string, filename: string) => {
    try {
      const supabase = createClient()
      if (!supabase) {
        toast.error('Database Error', {
          description: 'Supabase client not configured. Please refresh the page.'
        })
        return
      }

      toast.loading('Downloading results...', { id: `download-${batchId}` })

      // Fetch batch data to get csv_filename and created_at for proper filename generation
      const { data: batchData } = await supabase
        .from('batches')
        .select('csv_filename, created_at')
        .eq('id', batchId)
        .single()

      // Fetch batch_results for this batch (including token data)
      const { data: results, error } = await supabase
        .from('batch_results')
        .select('input_data, output_data, status, error_message, input_tokens, output_tokens, model')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true })

      if (error) {
        logError(new Error('Batch results fetch failed'), {
          source: 'dashboard/downloadBatchResults',
          batchId,
          supabaseError: error
        })
        toast.error('Failed to Fetch Results', {
          description: 'Please try again or contact support if the issue persists.',
          id: `download-${batchId}`
        })
        return
      }

      if (!results || results.length === 0) {
        toast.warning('No Results Available', {
          description: 'The batch may still be processing. Please try again in a few moments.',
          id: `download-${batchId}`
        })
        return
      }

      // Use DRY shared function - ensures RUN and EXECUTIONS exports are always 100% aligned
      const flattenedResults = flattenBatchResultsForExport(results as BatchResultRow[])
      const csvContent = exportToCSV(flattenedResults)
      
      // Generate user-oriented filename using batch data (consistent with RUN page export)
      const exportFilename = batchData
        ? generateExportFilenameFromBatch(batchData, 'csv')
        : generateExportFilename(filename, new Date(), 'csv')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportFilename
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Download Complete', {
        description: `Successfully downloaded results for ${filename}`,
        id: `download-${batchId}`
      })
    } catch (err) {
      logError(err instanceof Error ? err : new Error('Download batch results failed'), {
        source: 'dashboard/downloadBatchResults',
        batchId,
        filename
      })
      toast.error('Download Failed', {
        description: 'An error occurred while downloading results. Please try again.',
        id: `download-${batchId}`
      })
    }
  }

  // Status badge function replaced with StatusBadgeWrapper component
  // Keeping for backward compatibility if needed elsewhere
  const getStatusBadge = (status: Batch['status']) => {
    return <StatusBadgeWrapper status={status} size="sm" />
  }

  // Column configuration for table toggle
  const tableColumns: ColumnConfig[] = [
    { key: 'filename', label: 'Filename', defaultVisible: true, hideable: false },
    { key: 'status', label: 'Status', defaultVisible: true, hideable: false },
    { key: 'progress', label: 'Progress', defaultVisible: true },
    { key: 'model', label: 'Model & Tokens', defaultVisible: true },
    { key: 'created', label: 'Created', defaultVisible: true },
    { key: 'actions', label: 'Actions', defaultVisible: true, hideable: false },
  ]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-secondary/40 border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            <h2 className="text-sm font-medium text-red-400">Failed to Load Dashboard</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {error}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Retry loading dashboard"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
            <Button
              onClick={() => router.push('/agents')}
              variant="outline"
              className="w-full bg-secondary border-border text-foreground hover:bg-accent"
              aria-label="Go to agents"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Go to Agents
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const analyticsContent = (
    <AnalyticsDashboard />
  )

  const executionsContent = (
    <div className="p-4 sm:p-6">
      <div className="space-y-4 sm:space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-secondary/40 border border-border rounded-md p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Total Executions</div>
                  <div className="text-base font-semibold text-foreground">{stats.totalBatches}</div>
                </div>

                <div className="bg-secondary/40 border border-border rounded-md p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Completed</div>
                  <div className="text-base font-semibold text-green-400">
                    {stats.completedBatches}
                  </div>
                </div>

                <div className="bg-secondary/40 border border-border rounded-md p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Failed</div>
                  <div className="text-base font-semibold text-red-400">
                    {stats.failedBatches}
                  </div>
                </div>

                <div className="bg-secondary/40 border border-border rounded-md p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Success Rate</div>
                  <div className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <TrendingUp className="h-4 w-4 text-green-400" aria-hidden="true" />
                    <span>{stats.successRate}%</span>
                  </div>
                </div>
              </div>

              {/* Recent Batches */}
              <div className="bg-secondary/40 border border-border rounded-md overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-foreground">Executions</h2>
              </div>
              <div className="flex items-center gap-2">
                <TableColumnToggle
                  columns={tableColumns}
                  onVisibilityChange={setVisibleColumns}
                  className="bg-secondary border-border text-foreground hover:bg-accent"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCSV}
                  disabled={filteredBatches.length === 0}
                  className="bg-secondary border-border text-foreground hover:bg-accent"
                  aria-label="Download batches as CSV"
                >
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadJSON}
                  disabled={filteredBatches.length === 0}
                  className="bg-secondary border-border text-foreground hover:bg-accent"
                  aria-label="Download batches as JSON"
                >
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  JSON
                </Button>
              </div>
            </div>
            {batches.length > 0 && (
              <div className="mt-4 space-y-3">
                {/* Search */}
                {batches.length > 5 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      placeholder="Search by filename or status..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10 bg-secondary/70 border-border text-foreground placeholder:text-muted-foreground"
                      aria-label="Search batches by filename or status"
                      title="Search batches by filename or status"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Search help"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-medium mb-1">Search Scope</p>
                          <p className="text-xs">
                            Searches through batch filenames and status. Use status filters below for more precise filtering.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded p-0.5 hover:bg-secondary"
                        aria-label="Clear search"
                        title="Clear search (Esc)"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                
                {/* Filters and Sort */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  {/* Status Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Filter:</span>
                    <Badge
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setStatusFilter('all')}
                    >
                      All
                    </Badge>
                    <Badge
                      variant={statusFilter === 'completed' ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
                    >
                      Completed
                    </Badge>
                    <Badge
                      variant={statusFilter === 'processing' ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setStatusFilter(statusFilter === 'processing' ? 'all' : 'processing')}
                    >
                      Processing
                    </Badge>
                    <Badge
                      variant={statusFilter === 'failed' ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
                    >
                      Failed
                    </Badge>
                  </div>
                  
                  {/* Sort */}
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground">Sort:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'date') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                        } else {
                          setSortBy('date')
                          setSortOrder('desc')
                        }
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Date
                      {sortBy === 'date' && (
                        sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'status') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                        } else {
                          setSortBy('status')
                          setSortOrder('desc')
                        }
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Status
                      {sortBy === 'status' && (
                        sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'name') {
                          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                        } else {
                          setSortBy('name')
                          setSortOrder('asc')
                        }
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Name
                      {sortBy === 'name' && (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Results Count */}
                {(statusFilter !== 'all' || searchQuery) && filteredBatches.length !== batches.length && (
                  <div className="text-xs text-muted-foreground">
                    Showing {filteredBatches.length} of {batches.length} executions
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-6">
            {batches.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No executions yet"
                description="Get started by creating your first batch"
                action={{
                  label: 'Create First Batch',
                  onClick: () => router.push('/bulk'),
                }}
              />
            ) : filteredBatches.length === 0 ? (
              <EmptyState
                variant="filtered"
                title="No batches match your search"
                description={searchQuery || statusFilter !== 'all' 
                  ? `No batches found matching "${searchQuery}"${statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}. Try adjusting your search query or filters.`
                  : 'No batches found.'}
                clearFilter={
                  searchQuery || statusFilter !== 'all'
                    ? {
                        label: 'Clear all filters',
                        onClick: () => {
                          setSearchQuery('')
                          setStatusFilter('all')
                        },
                      }
                    : undefined
                }
                action={
                  batches.length === 0
                    ? {
                        label: 'Create First Batch',
                        onClick: () => router.push('/bulk'),
                      }
                    : undefined
                }
              />
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto -mx-6 sm:mx-0 touch-pan-x">
                  <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                    <table className="w-full text-sm min-w-[600px] sm:min-w-0">
                      <thead className="bg-secondary/50 border-b border-border">
                    <tr>
                      {visibleColumns.includes('filename') && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Filename</th>
                      )}
                      {visibleColumns.includes('status') && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      )}
                      {visibleColumns.includes('progress') && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                      )}
                      {visibleColumns.includes('model') && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Model & Tokens</th>
                      )}
                      {visibleColumns.includes('created') && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                      )}
                      {visibleColumns.includes('actions') && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-secondary/30 transition-colors">
                        {visibleColumns.includes('filename') && (
                          <td className="px-4 py-3 text-foreground font-medium">
                            <div className="flex items-center gap-2">
                              <TruncatedText 
                                text={batch.csv_filename} 
                                maxLength={30}
                                className="text-sm"
                              />
                              {batch.is_scheduled && (
                                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs font-medium">
                                  Scheduled
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {visibleColumns.includes('status') && (
                          <td className="px-4 py-3">{getStatusBadge(batch.status)}</td>
                        )}
                        {visibleColumns.includes('progress') && (
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            <ProgressDisplay
                              processed={batch.processed_rows}
                              total={batch.total_rows}
                              showCount={true}
                              size="sm"
                            />
                          </td>
                        )}
                        {visibleColumns.includes('model') && (
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {batch.model_used ? (
                              <div className="space-y-1">
                                <div className="font-medium text-foreground">{batch.model_used}</div>
                                <div className="text-xs">
                                  ↑ {batch.total_input_tokens?.toLocaleString() || 0} / ↓ {batch.total_output_tokens?.toLocaleString() || 0}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('created') && (
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {formatDate(batch.created_at)}
                          </td>
                        )}
                        {visibleColumns.includes('actions') && (
                          <td className="px-4 py-3 text-right">
                            {(batch.status === 'completed' || batch.status === 'completed_with_errors') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadBatchResults(batch.id, batch.csv_filename)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                                aria-label={`Download results for ${batch.csv_filename}`}
                                data-testid="download-results-button"
                              >
                                <Download className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <PageWithTabs
      defaultValue="analytics"
      tabs={[
        {
          value: 'analytics',
          label: 'Analytics',
          icon: <BarChart3 className="h-3.5 w-3.5" />,
          content: analyticsContent,
        },
        {
          value: 'executions',
          label: 'Executions',
          icon: <Activity className="h-3.5 w-3.5" />,
          content: executionsContent,
        },
      ]}
    />
  )
}
