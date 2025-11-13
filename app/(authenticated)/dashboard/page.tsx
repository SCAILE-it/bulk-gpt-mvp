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
import { Activity, Plus, TrendingUp, Clock, CheckCircle2, XCircle, Loader2, Download, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { logError } from '@/lib/errors'
import { toast } from 'sonner'
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
}

interface DashboardStats {
  totalBatches: number
  completedBatches: number
  failedBatches: number
  successRate: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>([])
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState<DashboardStats>({
    totalBatches: 0,
    completedBatches: 0,
    failedBatches: 0,
    successRate: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

        // Fetch token usage for each batch
        const batchesWithTokens = await Promise.all(
          (batchesData || []).map(async (batch) => {
            const { data: tokenData } = await supabase
              .from('batch_results')
              .select('input_tokens, output_tokens, model')
              .eq('batch_id', batch.id)
              .limit(1000) // Reasonable limit for aggregation

            if (!tokenData || tokenData.length === 0) {
              return batch
            }

            const totalInputTokens = tokenData.reduce((sum, row) => sum + (row.input_tokens || 0), 0)
            const totalOutputTokens = tokenData.reduce((sum, row) => sum + (row.output_tokens || 0), 0)
            const modelUsed = tokenData.find(row => row.model)?.model

            return {
              ...batch,
              total_input_tokens: totalInputTokens,
              total_output_tokens: totalOutputTokens,
              model_used: modelUsed,
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

  // Filter batches based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBatches(batches)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = batches.filter(batch =>
      batch.csv_filename.toLowerCase().includes(query) ||
      batch.status.toLowerCase().includes(query)
    )
    setFilteredBatches(filtered)
  }, [searchQuery, batches])

  const downloadCSV = () => {
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
  }

  const downloadJSON = () => {
    const jsonContent = JSON.stringify(filteredBatches, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batches-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
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

      // Parse first result to get input column names and output column names
      const firstResult = results[0]
      const inputData = typeof firstResult.input_data === 'string'
        ? JSON.parse(firstResult.input_data)
        : firstResult.input_data
      const inputColumns = Object.keys(inputData)

      // Parse output_data to determine output columns (spread JSON fields)
      let outputColumns: string[] = []
      if (firstResult.output_data) {
        let outputObj: Record<string, unknown> | null = null
        
        if (typeof firstResult.output_data === 'string') {
          try {
            const parsed = JSON.parse(firstResult.output_data)
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              outputObj = parsed
            }
          } catch {
            // Not JSON, will use single Output column
          }
        } else if (typeof firstResult.output_data === 'object' && firstResult.output_data !== null) {
          outputObj = firstResult.output_data as Record<string, unknown>
        }
        
        if (outputObj) {
          outputColumns = Object.keys(outputObj)
        }
      }

      // Generate CSV with token data - spread output fields as separate columns
      const headers = [
        ...inputColumns,
        ...(outputColumns.length > 0 ? outputColumns : ['Output']), // Use parsed columns or fallback to 'Output'
        'Status',
        'Error',
        'Input_Tokens',
        'Output_Tokens',
        'Model'
      ]
      
      const csvRows = results.map(r => {
        const input = typeof r.input_data === 'string' ? JSON.parse(r.input_data) : r.input_data
        const inputValues = inputColumns.map(col => {
          const value = input[col] || ''
          return `"${String(value).replace(/"/g, '""')}"`
        })
        
        // Parse and spread output fields
        let outputValues: string[] = []
        if (r.output_data) {
          let outputObj: Record<string, unknown> | null = null
          
          if (typeof r.output_data === 'string') {
            try {
              const parsed = JSON.parse(r.output_data)
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                outputObj = parsed
              } else {
                // Not an object, use as single value
                outputValues = [`"${String(parsed).replace(/"/g, '""')}"`]
              }
            } catch {
              // Not JSON, use as string
              outputValues = [`"${r.output_data.replace(/"/g, '""')}"`]
            }
          } else if (typeof r.output_data === 'object' && r.output_data !== null) {
            outputObj = r.output_data as Record<string, unknown>
          }
          
          if (outputObj) {
            // Spread object fields as separate columns
            outputValues = outputColumns.map(col => {
              const value = outputObj![col]
              if (value === null || value === undefined) {
                return '""'
              } else if (typeof value === 'object') {
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`
              } else {
                return `"${String(value).replace(/"/g, '""')}"`
              }
            })
          }
        } else {
          // No output data - fill with empty strings
          outputValues = outputColumns.length > 0 
            ? outputColumns.map(() => '""')
            : ['""']
        }
        
        const status = r.status || ''
        const error = r.error_message ? `"${r.error_message.replace(/"/g, '""')}"` : '""'
        const inputTokens = r.input_tokens || 0
        const outputTokens = r.output_tokens || 0
        const model = r.model || ''
        
        return [...inputValues, ...outputValues, status, error, inputTokens, outputTokens, model].join(',')
      })

      const csvContent = [headers.join(','), ...csvRows].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `results-${filename.replace('.csv', '')}-${new Date().toISOString().split('T')[0]}.csv`
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

  const getStatusBadge = (status: Batch['status']) => {
    const variants = {
      pending: { icon: Clock, label: 'Pending', className: 'bg-accent text-muted-foreground border-border' },
      processing: { icon: Loader2, label: 'Processing', className: 'bg-primary/10 text-primary border-primary/20' },
      completed: { icon: CheckCircle2, label: 'Completed', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
      completed_with_errors: { icon: CheckCircle2, label: 'Completed with errors', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      failed: { icon: XCircle, label: 'Failed', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    }

    const { icon: Icon, label, className } = variants[status]
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    )
  }

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
              onClick={() => router.push('/bulk')}
              variant="outline"
              className="w-full bg-secondary border-border text-foreground hover:bg-accent"
              aria-label="Go to bulk processor"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Go to Bulk Processor
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground p-6">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-sm font-medium tracking-tight flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Executions
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Overview of your batch processing activity
            </p>
          </div>
          <Button 
            onClick={() => router.push('/bulk')} 
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            aria-label="Create new batch"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            New Batch
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-secondary/40 border border-border rounded-lg p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Total Batches</div>
            <div className="text-xl font-semibold text-foreground">{stats.totalBatches}</div>
          </div>

          <div className="bg-secondary/40 border border-border rounded-lg p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Completed</div>
            <div className="text-xl font-semibold text-green-400">
              {stats.completedBatches}
            </div>
          </div>

          <div className="bg-secondary/40 border border-border rounded-lg p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Failed</div>
            <div className="text-xl font-semibold text-red-400">
              {stats.failedBatches}
            </div>
          </div>

          <div className="bg-secondary/40 border border-border rounded-lg p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Success Rate</div>
            <div className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4 text-green-400" aria-hidden="true" />
              <span>{stats.successRate}%</span>
            </div>
          </div>
        </div>

        {/* Recent Batches */}
        <div className="bg-secondary/40 border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-foreground">Recent Batches</h2>
                <p className="text-xs text-muted-foreground mt-1">Search, filter, and download your batch history</p>
              </div>
              <div className="flex items-center gap-2">
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
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search by filename or status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/70 border-border text-foreground placeholder:text-muted-foreground"
                  aria-label="Search batches"
                />
              </div>
            )}
          </div>
          <div className="p-6">
            {batches.length === 0 ? (
              <div className="text-center py-12" role="status" aria-live="polite">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-sm font-medium text-foreground mb-2">No batches yet</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Get started by creating your first batch
                </p>
                <Button 
                  onClick={() => router.push('/bulk')} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  aria-label="Create your first batch"
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Create First Batch
                </Button>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12" role="status" aria-live="polite">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-sm font-medium text-foreground mb-2">No results found</h3>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your search query
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Filename</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Model & Tokens</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium">{batch.csv_filename}</td>
                        <td className="px-4 py-3">{getStatusBadge(batch.status)}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {batch.processed_rows} / {batch.total_rows} rows
                        </td>
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
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {formatDate(batch.created_at)}
                        </td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
