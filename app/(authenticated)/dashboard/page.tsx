/**
 * ABOUTME: Dashboard page showing batch history and quick stats
 * ABOUTME: Displays recent batches, success rate, and links to wizard/profile
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

      // Parse first result to get input column names
      const firstResult = results[0]
      const inputData = typeof firstResult.input_data === 'string'
        ? JSON.parse(firstResult.input_data)
        : firstResult.input_data
      const inputColumns = Object.keys(inputData)

      // Generate CSV with token data
      const headers = [...inputColumns, 'AI_Output', 'Status', 'Error', 'Input_Tokens', 'Output_Tokens', 'Model']
      const csvRows = results.map(r => {
        const input = typeof r.input_data === 'string' ? JSON.parse(r.input_data) : r.input_data
        const inputValues = inputColumns.map(col => `"${(input[col] || '').replace(/"/g, '""')}"`)
        const output = `"${(r.output_data || '').replace(/"/g, '""')}"`
        const status = r.status || ''
        const error = r.error_message ? `"${r.error_message.replace(/"/g, '""')}"` : '""'
        const inputTokens = r.input_tokens || 0
        const outputTokens = r.output_tokens || 0
        const model = r.model || ''
        return [...inputValues, output, status, error, inputTokens, outputTokens, model].join(',')
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
      pending: { icon: Clock, label: 'Pending', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
      processing: { icon: Loader2, label: 'Processing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      completed: { icon: CheckCircle2, label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      completed_with_errors: { icon: CheckCircle2, label: 'Completed with errors', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
      failed: { icon: XCircle, label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    }

    const { icon: Icon, label, className } = variants[status]
    return (
      <Badge variant="outline" className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
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
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Failed to Load Dashboard</CardTitle>
            </div>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              variant="default"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button
              onClick={() => router.push('/bulk')}
              variant="outline"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Go to Bulk Processor
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of your batch processing activity
            </p>
          </div>
          <Button onClick={() => router.push('/bulk')} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            New Batch
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Batches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBatches}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.completedBatches}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.failedBatches}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Success Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                {stats.successRate}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Batches */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Recent Batches</CardTitle>
                <CardDescription>Search, filter, and download your batch history</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCSV}
                  disabled={filteredBatches.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadJSON}
                  disabled={filteredBatches.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>
            {batches.length > 0 && (
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename or status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No batches yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started by creating your first batch
                </p>
                <Button onClick={() => router.push('/bulk')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Batch
                </Button>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search query
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead className="text-right">Model & Tokens</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.csv_filename}</TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {batch.processed_rows} / {batch.total_rows} rows
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {batch.model_used ? (
                          <div className="space-y-1">
                            <div className="font-medium">{batch.model_used}</div>
                            <div className="text-xs">
                              ↑ {batch.total_input_tokens?.toLocaleString() || 0} / ↓ {batch.total_output_tokens?.toLocaleString() || 0}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(batch.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(batch.status === 'completed' || batch.status === 'completed_with_errors') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadBatchResults(batch.id, batch.csv_filename)}
                            className="h-8 w-8 p-0"
                            title="Download results CSV"
                            data-testid="download-results-button"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
