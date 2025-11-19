/**
 * Executions List Component
 * Extracted from analytics/executions pages for lazy loading
 * Contains batch table with filtering, sorting, and export functionality
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, TrendingUp, Download, Search, RefreshCw, AlertCircle, X, ArrowUp, ArrowDown, HelpCircle } from 'lucide-react'
import { logError } from '@/lib/errors'
import { toast } from 'sonner'
import { flattenBatchResultsForExport, exportToCSV } from '@/lib/export'
import { EmptyState } from '@/components/ui/empty-state'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadgeWrapper } from '@/components/integration/StatusBadgeWrapper'
import { TruncatedText } from '@/components/ui/truncated-text'
import { ProgressDisplay } from '@/components/integration/ProgressDisplay'
import { TableColumnToggle, type ColumnConfig } from '@/components/ui/table-column-toggle'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

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
  scheduled_run_name?: string
  is_scheduled?: boolean
}

interface DashboardStats {
  totalBatches: number
  completedBatches: number
  failedBatches: number
  successRate: number
}

export function ExecutionsList() {
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
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/auth')
          return
        }

        const { data, error: fetchError } = await supabase
          .from('batches')
          .select('*')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        const batchData = data || []
        setBatches(batchData)

        const completedCount = batchData.filter(b =>
          b.status === 'completed' || b.status === 'completed_with_errors'
        ).length
        const failedCount = batchData.filter(b => b.status === 'failed').length
        const successRate = batchData.length > 0
          ? Math.round((completedCount / batchData.length) * 100)
          : 0

        setStats({
          totalBatches: batchData.length,
          completedBatches: completedCount,
          failedBatches: failedCount,
          successRate,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data'
        setError(errorMessage)
        logError(err instanceof Error ? err : new Error(errorMessage), { source: 'ExecutionsList/fetchDashboardData' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [router])

  useEffect(() => {
    let filtered = [...batches]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(b =>
        b.csv_filename.toLowerCase().includes(query) ||
        b.status.toLowerCase().includes(query) ||
        (b.scheduled_run_name && b.scheduled_run_name.toLowerCase().includes(query))
      )
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      } else if (sortBy === 'status') {
        return sortOrder === 'desc'
          ? b.status.localeCompare(a.status)
          : a.status.localeCompare(b.status)
      } else {
        return sortOrder === 'desc'
          ? b.csv_filename.localeCompare(a.csv_filename)
          : a.csv_filename.localeCompare(b.csv_filename)
      }
    })

    setFilteredBatches(filtered)
  }, [batches, statusFilter, searchQuery, sortBy, sortOrder])

  const downloadCSV = () => {
    const csvData = filteredBatches.map(batch => ({
      filename: batch.csv_filename,
      status: batch.status,
      total_rows: batch.total_rows,
      processed_rows: batch.processed_rows,
      created_at: new Date(batch.created_at).toLocaleString(),
      model: batch.model_used || 'N/A',
      input_tokens: batch.total_input_tokens || 0,
      output_tokens: batch.total_output_tokens || 0,
    }))

    exportToCSV(csvData)
    toast.success('CSV downloaded')
  }

  const downloadJSON = () => {
    const json = JSON.stringify(filteredBatches, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'batches-export.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('JSON downloaded')
  }

  async function exportBatch(batchId: string, format: 'csv' | 'json') {
    try {
      const supabase = createClient()
      if (!supabase) throw new Error('Supabase not configured')

      const { data: batch } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single()

      if (!batch) throw new Error('Batch not found')

      const { data: results, error } = await supabase
        .from('batch_results')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!results || results.length === 0) {
        toast.error('No results to export')
        return
      }

      const flattenedResults = flattenBatchResultsForExport(results)

      if (format === 'csv') {
        exportToCSV(flattenedResults)
      } else {
        const json = JSON.stringify(flattenedResults, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${batch.csv_filename}-results.json`
        a.click()
        URL.revokeObjectURL(url)
      }

      toast.success(`${format.toUpperCase()} exported successfully`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      toast.error(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), { source: 'ExecutionsList/exportBatch', batchId, format })
    }
  }

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

  return (
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

        {/* Batch Table */}
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
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {batches.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Plus}
                  title="No executions yet"
                  description="Start by running your first batch with an AI agent"
                  action={{
                    label: "Go to Agents",
                    onClick: () => router.push('/agents'),
                    variant: 'default'
                  }}
                  size="sm"
                  variant="default"
                />
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-muted-foreground">No batches match your filters</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all')
                    setSearchQuery('')
                  }}
                  className="mt-4 text-xs"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-secondary/50 border-b border-border">
                  <tr>
                    {visibleColumns.includes('filename') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Filename
                      </th>
                    )}
                    {visibleColumns.includes('status') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                    )}
                    {visibleColumns.includes('progress') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Progress
                      </th>
                    )}
                    {visibleColumns.includes('model') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Model & Tokens
                      </th>
                    )}
                    {visibleColumns.includes('created') && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Created
                      </th>
                    )}
                    {visibleColumns.includes('actions') && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBatches.map((batch) => (
                    <tr
                      key={batch.id}
                      className="hover:bg-white/5 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/executions?batch=${batch.id}`)}
                    >
                      {visibleColumns.includes('filename') && (
                        <td className="px-4 py-3 text-xs text-foreground max-w-xs">
                          <TruncatedText text={batch.csv_filename} maxLength={40} />
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="px-4 py-3">
                          <StatusBadgeWrapper status={batch.status} size="sm" />
                        </td>
                      )}
                      {visibleColumns.includes('progress') && (
                        <td className="px-4 py-3">
                          <ProgressDisplay
                            processed={batch.processed_rows}
                            total={batch.total_rows}
                          />
                        </td>
                      )}
                      {visibleColumns.includes('model') && (
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {batch.model_used && (
                            <div className="space-y-0.5">
                              <div className="text-foreground font-mono text-[10px]">{batch.model_used}</div>
                              {(batch.total_input_tokens || batch.total_output_tokens) && (
                                <div className="text-[10px] text-muted-foreground">
                                  {batch.total_input_tokens?.toLocaleString() || 0}↑ / {batch.total_output_tokens?.toLocaleString() || 0}↓
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.includes('created') && (
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(batch.created_at)}
                        </td>
                      )}
                      {visibleColumns.includes('actions') && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                exportBatch(batch.id, 'csv')
                              }}
                              className="h-7 px-2 text-xs"
                              disabled={batch.status === 'pending' || batch.status === 'processing'}
                            >
                              CSV
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                exportBatch(batch.id, 'json')
                              }}
                              className="h-7 px-2 text-xs"
                              disabled={batch.status === 'pending' || batch.status === 'processing'}
                            >
                              JSON
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
