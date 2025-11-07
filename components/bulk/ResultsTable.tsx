/**
 * ABOUTME: Results table component - displays batch processing results in real-time
 * ABOUTME: Shows status, input data, and AI-generated output for each row
 */

'use client'

import { CheckCircle, XCircle, Loader2, Download } from 'lucide-react'
import { BatchStatusCard } from './BatchStatusCard'

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
}

/**
 * Format AI output for display - intelligently handles JSON responses
 */
function formatOutputValue(output: string | object): string {
  if (typeof output === 'string') {
    // Strip markdown code blocks (```json ... ``` or ``` ... ```)
    let cleanOutput = output.trim()
    const codeBlockMatch = cleanOutput.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/m)
    if (codeBlockMatch) {
      cleanOutput = codeBlockMatch[1].trim()
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(cleanOutput)
      if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed)

        // Single key object - show just the value
        if (keys.length === 1) {
          const value = parsed[keys[0]]
          return typeof value === 'object'
            ? JSON.stringify(value, null, 2)
            : String(value)
        }

        // Multiple keys - show formatted key-value pairs
        return keys
          .map(k => {
            const value = parsed[k]
            return typeof value === 'object'
              ? `${k}: ${JSON.stringify(value)}`
              : `${k}: ${value}`
          })
          .join('\n')
      }
      return String(parsed)
    } catch {
      // Not JSON - return as-is
      return output
    }
  }

  // Already an object
  return typeof output === 'object'
    ? JSON.stringify(output, null, 2)
    : String(output)
}

export function ResultsTable({
  results,
  columns,
  outputColumns = [],
  progress,
  processingStartTime,
  onExport
}: ResultsTableProps) {
  const successCount = results.filter(r => r.status === 'completed').length
  const errorCount = results.filter(r => r.status === 'failed').length

  // Calculate estimated time remaining
  const estimatedSeconds = progress && processingStartTime && progress.completed < progress.total
    ? (() => {
        const elapsed = Date.now() - processingStartTime
        const avgTimePerRow = elapsed / Math.max(progress.completed, 1)
        const remaining = (progress.total - progress.completed) * avgTimePerRow
        return Math.ceil(remaining / 1000)
      })()
    : null

  return (
    <>
      {/* Batch Status Card - Show when actively processing */}
      {progress && progress.total > 0 && (
        <BatchStatusCard
          progress={progress}
          successCount={successCount}
          errorCount={errorCount}
          estimatedSeconds={estimatedSeconds}
        />
      )}

      {/* Header */}
      <div className="border-b border-white/5">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-zinc-400">Results</span>
            <span className="text-xs text-zinc-600">
              {progress
                ? `${progress.completed}/${progress.total} rows`
                : `${results.length} rows`
              }
            </span>
          </div>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-white/5 rounded-md text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-md border-b border-white/5">
            <tr>
              <th className="px-4 py-2 text-left w-8"></th>
              {columns.map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium text-zinc-500">{h}</th>
              ))}
              {outputColumns.length > 0 ? (
                outputColumns.map(col => (
                  <th key={col} className="px-4 py-2 text-left font-medium text-zinc-500">{col}</th>
                ))
              ) : (
                <th className="px-4 py-2 text-left font-medium text-zinc-500">Output</th>
              )}
            </tr>
          </thead>
          <tbody>
            {results.map((result, i) => (
              <tr
                key={result.id}
                className={`
                  relative border-b border-white/5
                  hover:bg-zinc-800/40
                  transition-colors duration-150
                  cursor-pointer
                  ${i % 2 === 0 ? 'bg-zinc-900/40' : 'bg-transparent'}
                `}
              >
                {/* Processing accent bar */}
                {result.status === 'processing' && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500/50" />
                )}

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {result.status === 'completed' && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-zinc-500">Done</span>
                      </>
                    )}
                    {result.status === 'failed' && (
                      <>
                        <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-400">Failed</span>
                      </>
                    )}
                    {result.status === 'processing' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400 flex-shrink-0" />
                        <span className="text-xs text-blue-400">Processing...</span>
                      </>
                    )}
                    {result.status === 'pending' && (
                      <>
                        <Loader2 className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs text-blue-400">
                            {processingStartTime && Date.now() - processingStartTime > 60000
                              ? 'Processing...'
                              : 'Starting AI processor...'}
                          </span>
                          {processingStartTime && Date.now() - processingStartTime < 120000 && (
                            <span className="text-xs text-zinc-600">
                              {Math.floor((Date.now() - processingStartTime) / 1000)}s elapsed
                              {Date.now() - processingStartTime < 60000 && ' (may take 60-90s)'}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
                {columns.map(h => (
                  <td key={h} className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {result.input[h] || '—'}
                  </td>
                ))}
                {outputColumns.length > 0 ? (
                  // Parse JSON output and render each field as a separate column
                  outputColumns.map(col => {
                    if (result.error) {
                      return (
                        <td key={col} className="px-4 py-3">
                          <span className="text-red-400 text-xs">{result.error}</span>
                        </td>
                      )
                    }

                    if (!result.output) {
                      return (
                        <td key={col} className="px-4 py-3">
                          <span className="text-zinc-600">—</span>
                        </td>
                      )
                    }

                    try {
                      // Parse the JSON output
                      const outputData = typeof result.output === 'string'
                        ? JSON.parse(result.output)
                        : result.output

                      const value = outputData[col]

                      // Handle different value types
                      if (value === null || value === undefined) {
                        return (
                          <td key={col} className="px-4 py-3">
                            <span className="text-zinc-600">—</span>
                          </td>
                        )
                      }

                      // If value is an array or object, format it intelligently
                      const displayValue = typeof value === 'object'
                        ? formatOutputValue(value)
                        : String(value)

                      return (
                        <td key={col} className="px-4 py-3 text-zinc-300">
                          <span className="line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap">
                            {displayValue}
                          </span>
                        </td>
                      )
                    } catch (error) {
                      // If JSON parsing fails, show the formatted output in the first column only
                      if (col === outputColumns[0]) {
                        return (
                          <td key={col} className="px-4 py-3 text-zinc-300">
                            <span className="line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap">
                              {formatOutputValue(result.output)}
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={col} className="px-4 py-3">
                          <span className="text-zinc-600">—</span>
                        </td>
                      )
                    }
                  })
                ) : (
                  // Fallback to single output column (original behavior)
                  <td className="px-4 py-3 text-zinc-300">
                    {result.error ? (
                      <span className="text-red-400 text-xs">{result.error}</span>
                    ) : result.output ? (
                      <span className="line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap">{formatOutputValue(result.output)}</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
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
