/**
 * ABOUTME: Results table component - displays batch processing results in real-time
 * ABOUTME: Shows status, input data, and AI-generated output for each row
 */

'use client'

import { CheckCircle, XCircle, Loader2, Download, Sparkles, FileSpreadsheet } from 'lucide-react'
import { BatchStatusCard } from './BatchStatusCard'
import { formatOutputValue } from '@/lib/utils/format-output'

interface Result {
  id: string
  input: Record<string, string>
  output: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

interface Progress {
  completed: number
  total: number
}

interface ResultsTableProps {
  results: Result[]
  columns: string[]
  outputColumns?: string[]
  progress?: Progress
  processingStartTime?: number
  onExport: () => void
  onExportToGoogleSheets?: () => void
  isTesting?: boolean
  testStartTime?: number
  testEstimatedSeconds?: number
  totalInputTokens?: number
  totalOutputTokens?: number
}

export function ResultsTable({
  results,
  columns,
  outputColumns = [],
  progress,
  processingStartTime,
  onExport,
  onExportToGoogleSheets,
  isTesting = false,
  testStartTime,
  testEstimatedSeconds,
  totalInputTokens,
  totalOutputTokens
}: ResultsTableProps) {
  const successCount = results.filter(r => r.status === 'completed').length
  const errorCount = results.filter(r => r.status === 'failed').length
  
  // For real-time progress, use progress prop if available, otherwise calculate from results
  // This ensures progress bar updates even before results arrive
  const effectiveProgress = progress || (results.length > 0 ? {
    completed: successCount + errorCount,
    total: results.length
  } : undefined)

  // Calculate estimated time remaining (only when we have at least 1 completed row)
  const estimatedSeconds = effectiveProgress && processingStartTime && effectiveProgress.completed < effectiveProgress.total && effectiveProgress.completed > 0
    ? (() => {
        const elapsed = Date.now() - processingStartTime
        const avgTimePerRow = elapsed / effectiveProgress.completed
        const remaining = (effectiveProgress.total - effectiveProgress.completed) * avgTimePerRow
        return Math.ceil(remaining / 1000)
      })()
    : null

  return (
    <>
      {/* Batch Status Card - Show when actively processing or testing */}
      {(effectiveProgress && effectiveProgress.total > 0) || isTesting ? (
        <BatchStatusCard
          progress={effectiveProgress || (isTesting ? { completed: 0, total: 1 } : undefined)}
          successCount={successCount}
          errorCount={errorCount}
          estimatedSeconds={isTesting ? testEstimatedSeconds : estimatedSeconds}
          isTesting={isTesting}
          testStartTime={testStartTime}
          processingStartTime={processingStartTime}
          totalInputTokens={totalInputTokens}
          totalOutputTokens={totalOutputTokens}
        />
      ) : null}

      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Results</span>
            <span className="text-xs text-muted-foreground">
              {effectiveProgress
                ? `${effectiveProgress.completed}/${effectiveProgress.total} rows`
                : `${results.length} rows`
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onExportToGoogleSheets && (
              <button
                onClick={onExportToGoogleSheets}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-border rounded-md text-sm text-foreground hover:bg-accent transition-colors"
                title="Export to Google Sheets"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Google Sheets</span>
              </button>
            )}
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-border rounded-md text-sm text-foreground hover:bg-accent transition-colors"
              title="Download as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-secondary/95 backdrop-blur-md border-b border-border">
            <tr>
              <th className="px-4 py-2 text-left w-8"></th>
              {/* Input columns - normal styling */}
              {columns.map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
              ))}
              {/* Output columns - highlighted as AI-generated */}
              {outputColumns.length > 0 ? (
                outputColumns.map(col => (
                  <th 
                    key={col} 
                    className="px-4 py-2 text-left font-medium text-primary/90 bg-primary/5 border-l border-primary/20 relative group"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary/70 flex-shrink-0" />
                      <span>{col}</span>
                      <span className="text-xs text-primary/60 font-normal ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        AI
                      </span>
                    </div>
                  </th>
                ))
              ) : (
                <th className="px-4 py-2 text-left font-medium text-primary/90 bg-primary/5 border-l border-primary/20">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary/70 flex-shrink-0" />
                    <span>Output</span>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Show loading state when testing and no results yet */}
            {isTesting && results.length === 0 && (
              <tr>
                <td colSpan={columns.length + outputColumns.length + 1} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Testing with first row...</p>
                      <p className="text-xs text-muted-foreground mt-1">Processing AI response</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {results.map((result, i) => (
              <tr
                key={result.id}
                className={`
                  relative border-b border-border
                  hover:bg-accent/40
                  transition-colors duration-150
                  cursor-pointer
                  ${i % 2 === 0 ? 'bg-secondary/40' : 'bg-transparent'}
                `}
              >
                {/* Processing accent bar */}
                {result.status === 'processing' && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary/50" />
                )}

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {result.status === 'completed' && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">Done</span>
                      </>
                    )}
                    {result.status === 'failed' && (
                      <div className="flex items-start gap-2 min-w-0">
                        <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-red-400 block">Failed</span>
                          {result.error && (
                            <span className="text-xs text-red-400/70 mt-0.5 block truncate" title={result.error}>
                              {result.error}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {result.status === 'processing' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                        <span className="text-xs text-primary">Processing...</span>
                      </>
                    )}
                    {result.status === 'pending' && (
                      <>
                        <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs text-primary">
                            {processingStartTime && Date.now() - processingStartTime > 60000
                              ? 'Processing...'
                              : 'Starting AI processor...'}
                          </span>
                          {processingStartTime && Date.now() - processingStartTime < 120000 && (
                            <span className="text-xs text-muted-foreground">
                              {Math.floor((Date.now() - processingStartTime) / 1000)}s elapsed
                              {Date.now() - processingStartTime < 60000 && ' (may take 60-90s)'}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
                {/* Input columns - normal styling */}
                {columns.map(h => (
                  <td key={h} className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {result.input[h] || '—'}
                  </td>
                ))}
                {/* Output columns - highlighted as AI-generated */}
                {outputColumns.length > 0 ? (
                  // Parse JSON output and render each field as a separate column
                  outputColumns.map(col => {
                    if (result.error) {
                      return (
                        <td key={col} className="px-4 py-3 bg-primary/5 border-l border-primary/20">
                          <span className="text-red-400 text-xs">{result.error}</span>
                        </td>
                      )
                    }

                    if (!result.output) {
                      return (
                        <td key={col} className="px-4 py-3 bg-primary/5 border-l border-primary/20">
                          <span className="text-muted-foreground">—</span>
                        </td>
                      )
                    }

                    try {
                      // Parse the JSON output
                      const outputData = typeof result.output === 'string'
                        ? JSON.parse(result.output)
                        : result.output

                      // Try exact match first
                      let value = outputData[col]

                      // Fallback: If exact match fails, try case-insensitive match
                      if (value === null || value === undefined) {
                        const keys = Object.keys(outputData)
                        const matchedKey = keys.find(k => k.toLowerCase() === col.toLowerCase())
                        if (matchedKey) {
                          value = outputData[matchedKey]
                          console.warn(`[ResultsTable] Column "${col}" not found, using "${matchedKey}" instead`)
                        }
                      }

                      // If still no match, show helpful error with available keys
                      if (value === null || value === undefined) {
                        const availableKeys = Object.keys(outputData).join(', ')
                        return (
                          <td
                            key={col}
                            className="px-4 py-3 bg-primary/5 border-l border-primary/20"
                            title={`Expected field "${col}" but AI returned: ${availableKeys}`}
                          >
                            <span className="text-muted-foreground">—</span>
                          </td>
                        )
                      }

                      // If value is an array or object, format it intelligently
                      const displayValue = typeof value === 'object'
                        ? formatOutputValue(value)
                        : String(value)

                      return (
                        <td key={col} className="px-4 py-3 text-foreground bg-primary/5 border-l border-primary/20">
                          <span className="line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap">
                            {displayValue}
                          </span>
                        </td>
                      )
                    } catch (error) {
                      // If JSON parsing fails, show the formatted output in the first column only
                      if (col === outputColumns[0]) {
                        return (
                          <td key={col} className="px-4 py-3 text-foreground bg-primary/5 border-l border-primary/20">
                            <span className="line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap">
                              {formatOutputValue(result.output)}
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={col} className="px-4 py-3 bg-primary/5 border-l border-primary/20">
                          <span className="text-muted-foreground">—</span>
                        </td>
                      )
                    }
                  })
                ) : (
                  // Fallback to single output column (original behavior)
                  <td className="px-4 py-3 text-foreground bg-primary/5 border-l border-primary/20">
                    {result.error ? (
                      <span className="text-red-400 text-xs">{result.error}</span>
                    ) : result.output ? (
                      <span className="line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap">{formatOutputValue(result.output)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
