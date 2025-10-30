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
  progress?: Progress
  processingStartTime?: number
  onExport: () => void
}

export function ResultsTable({
  results,
  columns,
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
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Output</th>
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
                        <div className="h-4 w-4 rounded-full border border-zinc-700 flex-shrink-0" />
                        <span className="text-xs text-zinc-600">Waiting in queue...</span>
                      </>
                    )}
                  </div>
                </td>
                {columns.map(h => (
                  <td key={h} className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {result.input[h] || '—'}
                  </td>
                ))}
                <td className="px-4 py-3 text-zinc-300">
                  {result.error ? (
                    <span className="text-red-400 text-xs">{result.error}</span>
                  ) : result.output ? (
                    <span className="line-clamp-3 text-xs leading-relaxed whitespace-pre-wrap">{String(result.output)}</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
