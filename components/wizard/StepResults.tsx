/**
 * ABOUTME: Step 3 of wizard - Display bulk processing results with export and filtering
 * ABOUTME: Shows results table, summary statistics, status filtering, and CSV export functionality
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Download, Copy, RotateCcw, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PARALLEL_CONCURRENCY } from '@/lib/processing-constants'

interface Result {
  id: string
  input: Record<string, string>
  output: string
  status: string
  error?: string
  retryCount?: number // Power-user: track retry attempts
}

interface Summary {
  total: number
  completed: number
  failed: number
}

export interface StepResultsProps {
  results: Result[]
  summary: Summary
  onRestart: () => void
  onBack: () => void
  isProcessing?: boolean
}

type FilterStatus = 'all' | 'completed' | 'failed'

/**
 * Format input object for display
 * - Extracts values from input object
 * - Displays first 3 values separated by bullets
 * - Handles empty objects gracefully
 * 
 * @param input - Record<string, string> from CSV row
 * @returns Formatted string like "John Doe • Acme Inc • CTO"
 */
function formatInputData(input: Record<string, string> | null | undefined): string {
  if (!input || Object.keys(input).length === 0) {
    return 'No input data'
  }

  const values = Object.values(input)
    .filter((v): v is string => v !== null && v !== undefined && v !== '')
    .map(v => v.trim())
    .slice(0, 3)

  return values.length > 0 ? values.join(' • ') : 'No input data'
}

/**
 * Format output string for display
 * - Removes markdown fences (```json ... ```)
 * - Parses JSON if needed and extracts readable values
 * - Truncates long outputs
 * 
 * @param output - String output from AI
 * @returns Formatted output string
 */
function formatOutputData(output: string): string {
  if (!output) return ''

  // Remove markdown fences (common in AI output)
  const clean = output.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()

  try {
    const parsed = JSON.parse(clean)
    if (typeof parsed === 'object' && parsed !== null) {
      const entries = Object.entries(parsed)

      // If single key-value pair, return just the value
      if (entries.length === 1) {
        return String(entries[0][1])
      }

      // Multiple keys, format as key: value pairs
      return entries
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    }
  } catch {
    // Not JSON, return cleaned string
  }

  return clean
}

export default function StepResults({
  results,
  summary,
  onRestart,
  onBack,
  isProcessing = false,
}: StepResultsProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [copySuccess, setCopySuccess] = useState(false)
  const copyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Filter results based on status
  const filteredResults = useMemo(() => {
    if (filterStatus === 'all') return results
    return results.filter(r => r.status === filterStatus)
  }, [results, filterStatus])

  // Export results as CSV
  const handleExportCSV = useCallback(() => {
    const headers = ['Input', 'Output', 'Status']
    const rows = filteredResults.map(r => [
      `"${formatInputData(r.input).replace(/"/g, '""')}"`,
      `"${formatOutputData(r.output).replace(/"/g, '""')}"`,
      r.status,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `bulk-results-${Date.now()}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filteredResults])

  // Copy results to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    const text = filteredResults
      .map(r => `Input: ${formatInputData(r.input)}\nOutput: ${formatOutputData(r.output)}\nStatus: ${r.status}\n`)
      .join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)

      // Clear any existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }

      // Set new timeout with cleanup
      copyTimeoutRef.current = setTimeout(() => {
        setCopySuccess(false)
        copyTimeoutRef.current = null
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [filteredResults])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  // Calculate retry stats (power-user feature)
  const totalRetries = useMemo(() => {
    return results.reduce((sum, r) => sum + (r.retryCount || 0), 0)
  }, [results])

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-8">
      {/* Processing Indicator - Power User Enhanced */}
      {isProcessing && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm font-medium font-mono text-gray-900 dark:text-gray-100">Processing {summary.completed} of {summary.total} rows...</span>
          </div>

          {/* Parallel Processing Badge */}
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium">
              ⚡ Processing in parallel ({PARALLEL_CONCURRENCY} concurrent)
            </span>
            {totalRetries > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium">
                ↻ Retries: {totalRetries}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Summary Statistics - Power User Style */}
      {results.length > 0 && (
        <Card className="p-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium font-mono text-gray-600 dark:text-gray-400">Total Rows</div>
              <div className="text-3xl font-bold font-mono text-gray-900 dark:text-gray-100">{summary.total}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium font-mono text-gray-600 dark:text-gray-400">Success</div>
              <div className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                {summary.completed}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium font-mono text-gray-600 dark:text-gray-400">Failed</div>
              <div className="text-3xl font-bold font-mono text-red-600 dark:text-red-400">
                {summary.failed}
              </div>
            </div>
          </div>

          {/* Additional Power-User Metrics */}
          {totalRetries > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-sm font-mono text-gray-600 dark:text-gray-400">
                <span className="font-medium">Total Retries:</span>
                <span className="text-yellow-600 dark:text-yellow-400">{totalRetries}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Filter and Export Controls - Only shown when results exist */}
      {results.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All ({summary.total})
            </Button>
            <Button
              variant={filterStatus === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('completed')}
            >
              Success ({summary.completed})
            </Button>
            <Button
              variant={filterStatus === 'failed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('failed')}
            >
              Failed ({summary.failed})
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      )}

      {/* Results Count */}
      {results.length > 0 && filterStatus !== 'all' && (
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Showing {filteredResults.length} of {summary.total} results
        </div>
      )}

      {/* Results Table */}
      {results.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-base text-gray-600 dark:text-gray-400">Processing will begin after you configure and start a batch</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono" role="table">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Input</th>
                  <th className="px-4 py-3 text-left font-medium">Output</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <tr key={result.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate" title={formatInputData(result.input)}>
                        {formatInputData(result.input)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {result.output ? (
                        <div className="max-w-md" title={formatOutputData(result.output)}>
                          {formatOutputData(result.output).length > 200
                            ? `${formatOutputData(result.output).slice(0, 200)}...`
                            : formatOutputData(result.output)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">
                          {result.error || "No output - failed to generate"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {result.status === 'completed' ? (
                          <div
                            className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            data-testid="status-completed"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </div>
                        ) : (
                          <div
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            data-testid="status-failed"
                          >
                            <XCircle className="h-3 w-3" />
                            Failed
                          </div>
                        )}
                        {/* Show retry count if > 0 */}
                        {result.retryCount && result.retryCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium">
                            ↻{result.retryCount}x
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Success Message */}
      {copySuccess && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-green-500 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400"
        >
          <CheckCircle2 className="h-4 w-4" />
          Results copied to clipboard successfully!
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          size="lg"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onRestart} size="lg">
          <RotateCcw className="mr-2 h-4 w-4" />
          Start New
        </Button>
      </div>
    </div>
  )
}
