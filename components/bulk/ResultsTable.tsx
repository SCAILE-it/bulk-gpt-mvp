/**
 * ABOUTME: Results table component - displays batch processing results in real-time
 * ABOUTME: Shows status, input data, and AI-generated output for each row
 */

'use client'

import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react'
import { Download, Sparkles, FileSpreadsheet, Save, ChevronDown, RotateCcw } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { BatchStatusCard } from './BatchStatusCard'
import { formatOutputValue } from '@/lib/utils/format-output'
import { AccessibleStatusBadge } from '@/components/ui/accessible-status-badge'
import { TableColumnToggle, type ColumnConfig } from '@/components/ui/table-column-toggle'

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
  onSaveToContext?: () => void
  onRetry?: (result: Result) => Promise<void>
  isTesting?: boolean
  testStartTime?: number
  testEstimatedSeconds?: number
  totalInputTokens?: number
  totalOutputTokens?: number
}

export const ResultsTable = memo(function ResultsTable({
  results,
  columns,
  outputColumns = [],
  progress,
  processingStartTime,
  onExport,
  onExportToGoogleSheets,
  onSaveToContext,
  onRetry,
  isTesting = false,
  testStartTime,
  testEstimatedSeconds,
  totalInputTokens,
  totalOutputTokens
}: ResultsTableProps) {
  // Column configuration for TableColumnToggle
  const columnConfigs = useMemo<ColumnConfig[]>(() => {
    const configs: ColumnConfig[] = [
      { key: 'status', label: 'Status', defaultVisible: true, hideable: false },
      ...columns.map(col => ({ key: col, label: col, defaultVisible: true })),
      ...outputColumns.map(col => ({ key: col, label: col, defaultVisible: true })),
    ]
    // If no output columns specified, add a generic "output" column
    if (outputColumns.length === 0) {
      configs.push({ key: 'output', label: 'Output', defaultVisible: true })
    }
    return configs
  }, [columns, outputColumns])

  // Column visibility state - initialize with all columns visible
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())

  // Initialize and update visible columns when column configs change (e.g., new CSV uploaded)
  useEffect(() => {
    const defaultVisible = columnConfigs
      .filter(col => col.defaultVisible !== false)
      .map(col => col.key)
    setVisibleColumns(new Set(defaultVisible))
  }, [columnConfigs])

  const handleVisibilityChange = useCallback((visible: string[]) => {
    setVisibleColumns(new Set(visible))
  }, [])
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set())
  const [retryingRowId, setRetryingRowId] = useState<string | null>(null)
  const [newlyCompletedRows, setNewlyCompletedRows] = useState<Set<string>>(new Set())
  
  // Virtualization setup - only for tables with 50+ rows
  const shouldVirtualize = results.length >= 50
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const rowHeightsRef = useRef<Map<number, number>>(new Map())
  
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: useCallback((index: number) => {
      // Check if we have a cached height for this row
      const cached = rowHeightsRef.current.get(index)
      if (cached) return cached
      
      // Estimate based on expanded state
      const result = results[index]
      if (!result) return 60
      const hasExpandedCell = Array.from(expandedCells).some(cellId => cellId.includes(result.id))
      return hasExpandedCell ? 150 : 60 // Base height: 60px, expanded: 150px
    }, [results, expandedCells]),
    overscan: 5, // Render 5 extra rows above/below viewport
    enabled: shouldVirtualize,
  })
  
  // Track newly completed rows for animation
  useEffect(() => {
    const completed = results.filter(r => r.status === 'completed').map(r => r.id)
    const newCompleted = completed.filter(id => !newlyCompletedRows.has(id))
    
    if (newCompleted.length > 0) {
      setNewlyCompletedRows(prev => new Set([...Array.from(prev), ...newCompleted]))
      // Clear animation state after animation completes (1.5s)
      setTimeout(() => {
        setNewlyCompletedRows(prev => {
          const next = new Set(Array.from(prev))
          newCompleted.forEach(id => next.delete(id))
          return next
        })
      }, 1500)
    }
  }, [results, newlyCompletedRows])
  
  const toggleCellExpansion = useCallback((cellId: string) => {
    setExpandedCells(prev => {
      const next = new Set(prev)
      if (next.has(cellId)) {
        next.delete(cellId)
      } else {
        next.add(cellId)
      }
      return next
    })
  }, [])
  
  // Render a single table row - extracted for reuse in virtualized and non-virtualized rendering
  const renderTableRow = useCallback((result: Result, i: number) => {
    return (
      <>
        {/* Processing accent bar */}
        {result.status === 'processing' && (
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary/50" />
        )}

        {visibleColumns.has('status') && (
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              {result.status === 'completed' && (
                <AccessibleStatusBadge
                  status="completed"
                  size="sm"
                  className={newlyCompletedRows.has(result.id) ? 'animate-success-pulse' : ''}
                  label={newlyCompletedRows.has(result.id) ? 'Done' : undefined}
                />
              )}
              {result.status === 'failed' && (
                <div className="flex items-start gap-2 min-w-0">
                  <AccessibleStatusBadge
                    status="failed"
                    size="sm"
                  />
                  {onRetry && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        setRetryingRowId(result.id)
                        try {
                          await onRetry(result)
                        } finally {
                          setRetryingRowId(null)
                        }
                      }}
                      disabled={retryingRowId === result.id}
                      className="flex items-center gap-1 px-2 py-1.5 min-h-[44px] sm:min-h-[32px] text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 touch-manipulation"
                      aria-label={retryingRowId === result.id ? 'Retrying failed row' : `Retry processing row ${i + 1}`}
                      aria-busy={retryingRowId === result.id}
                      title="Retry this row"
                    >
                      {retryingRowId === result.id ? (
                        <>
                          <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          <span>Retrying...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3 w-3" />
                          <span>Retry</span>
                        </>
                      )}
                    </button>
                  )}
                  {result.error && (
                    <div className="mt-0.5">
                      {result.error.length > 80 ? (
                        <>
                          <button
                            onClick={() => toggleCellExpansion(`error-${result.id}`)}
                            className="text-xs text-red-400/70 hover:text-red-400 cursor-pointer text-left w-full flex items-start gap-1 min-h-[44px] sm:min-h-[32px] py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 touch-manipulation"
                            aria-label={expandedCells.has(`error-${result.id}`) ? 'Collapse error message' : 'Expand error message'}
                            aria-expanded={expandedCells.has(`error-${result.id}`)}
                          >
                            <ChevronDown className={`h-3 w-3 mt-0.5 transition-transform ${expandedCells.has(`error-${result.id}`) ? 'rotate-180' : ''}`} aria-hidden="true" />
                            <span className={expandedCells.has(`error-${result.id}`) ? '' : 'line-clamp-1'}>
                              {result.error}
                            </span>
                          </button>
                          {expandedCells.has(`error-${result.id}`) && (
                            <p className="text-xs text-red-400/70 mt-1 whitespace-pre-wrap break-words pl-4">
                              {result.error}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-red-400/70">{result.error}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {result.status === 'processing' && (
                <AccessibleStatusBadge
                  status="processing"
                  size="sm"
                />
              )}
              {result.status === 'pending' && (
                <AccessibleStatusBadge
                  status="pending"
                  size="sm"
                />
              )}
            </div>
          </td>
        )}
        {/* Input columns - normal styling */}
        {columns.filter(col => visibleColumns.has(col)).map(h => (
          <td key={h} className="px-4 py-3 text-muted-foreground font-mono text-xs">
            {result.input[h] || '—'}
          </td>
        ))}
        {/* Output columns - highlighted as AI-generated */}
        {outputColumns.length > 0 ? (
          // Parse JSON output and render each field as a separate column
          outputColumns.filter(col => visibleColumns.has(col)).map(col => {
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

              // Check if text is long enough to need expansion
              const isLongText = displayValue.length > 150
              const cellId = `result-${result.id}-${col}`
              const isExpanded = expandedCells.has(cellId)
              
              return (
                <td key={col} className="px-4 py-3 text-foreground bg-primary/5 border-l border-primary/20">
                  {isLongText ? (
                    <div>
                      <button
                        onClick={() => toggleCellExpansion(cellId)}
                        className="text-left w-full flex items-start gap-1 cursor-pointer hover:opacity-80 transition-opacity min-h-[44px] sm:min-h-[32px] py-1 touch-manipulation"
                      >
                        <ChevronDown className={`h-3 w-3 mt-0.5 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <span className={`text-xs leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {displayValue}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs leading-relaxed whitespace-pre-wrap">
                      {displayValue}
                    </span>
                  )}
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
          visibleColumns.has('output') ? (
            <td className="px-4 py-3 text-foreground bg-primary/5 border-l border-primary/20">
              {result.error ? (
                (() => {
                  const cellId = `error-output-${result.id}`
                  const isExpanded = expandedCells.has(cellId)
                  return result.error.length > 80 ? (
                    <div>
                      <button
                        onClick={() => toggleCellExpansion(cellId)}
                        className="text-left w-full flex items-start gap-1 cursor-pointer hover:opacity-80 transition-opacity min-h-[44px] sm:min-h-[32px] py-1 touch-manipulation"
                      >
                        <ChevronDown className={`h-3 w-3 mt-0.5 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <span className={`text-red-400 text-xs ${isExpanded ? 'whitespace-pre-wrap break-words' : 'line-clamp-2'}`}>
                          {result.error}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-red-400 text-xs">{result.error}</span>
                  )
                })()
              ) : result.output ? (
                (() => {
                  const displayValue = formatOutputValue(result.output)
                  const isLongText = displayValue.length > 150
                  const cellId = `output-${result.id}`
                  const isExpanded = expandedCells.has(cellId)
                  return isLongText ? (
                    <div>
                      <button
                        onClick={() => toggleCellExpansion(cellId)}
                        className="text-left w-full flex items-start gap-1 cursor-pointer hover:opacity-80 transition-opacity min-h-[44px] sm:min-h-[32px] py-1 touch-manipulation"
                      >
                        <ChevronDown className={`h-3 w-3 mt-0.5 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <span className={`text-xs leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {displayValue}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs leading-relaxed whitespace-pre-wrap">{displayValue}</span>
                  )
                })()
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
          ) : null
        )}
      </>
    )
  }, [visibleColumns, columns, outputColumns, expandedCells, newlyCompletedRows, retryingRowId, onRetry, toggleCellExpansion])
  
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
      {/* Screen reader announcements for dynamic updates */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {effectiveProgress && effectiveProgress.completed > 0 && (
          <span>
            Processing: {effectiveProgress.completed} of {effectiveProgress.total} rows completed.
            {successCount > 0 && ` ${successCount} successful.`}
            {errorCount > 0 && ` ${errorCount} failed.`}
          </span>
        )}
        {isTesting && results.length === 0 && 'Testing prompt with first row...'}
        {results.length > 0 && !effectiveProgress && `${results.length} results ready.`}
      </div>

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
            {(columns.length > 0 || outputColumns.length > 0) && (
              <TableColumnToggle
                columns={columnConfigs}
                onVisibilityChange={handleVisibilityChange}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSaveToContext && results.length > 0 && (
              <button
                onClick={onSaveToContext}
                className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] bg-secondary border border-border rounded-md text-sm text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
                aria-label="Save output file to context for use in future prompts"
                title="Save output file to context"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="whitespace-nowrap">Save to Context</span>
              </button>
            )}
            {onExportToGoogleSheets && (
              <button
                onClick={onExportToGoogleSheets}
                className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] bg-secondary border border-border rounded-md text-sm text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
                aria-label="Export results to Google Sheets"
                title="Export to Google Sheets"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="whitespace-nowrap">Google Sheets</span>
              </button>
            )}
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] bg-secondary border border-border rounded-md text-sm text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
              aria-label={`Download ${results.length} results as CSV file`}
              title="Download as CSV"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="whitespace-nowrap">CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div 
        ref={tableContainerRef}
        className="flex-1 overflow-auto -mx-4 sm:mx-0 touch-pan-x"
        style={shouldVirtualize ? { height: '600px' } : undefined}
      >
        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
          <table className="w-full text-xs min-w-[600px] sm:min-w-0" role="table" aria-label="Processing results">
          <thead className="sticky top-0 bg-secondary/95 backdrop-blur-md border-b border-border z-10">
            <tr>
              {visibleColumns.has('status') && (
                <th className="px-4 py-2 text-left w-8" scope="col" aria-label="Status"></th>
              )}
              {/* Input columns - normal styling */}
              {columns.filter(col => visibleColumns.has(col)).map(h => (
                <th key={h} scope="col" className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
              ))}
              {/* Output columns - highlighted as AI-generated */}
              {outputColumns.length > 0 ? (
                outputColumns.filter(col => visibleColumns.has(col)).map(col => (
                  <th 
                    key={col}
                    scope="col"
                    className="px-4 py-2 text-left font-medium text-primary/90 bg-primary/5 border-l border-primary/20 relative group"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary/70 flex-shrink-0" aria-hidden="true" />
                      <span>{col}</span>
                      <span className="text-xs text-primary/60 font-normal ml-auto opacity-0 group-hover:opacity-100 transition-opacity" aria-label="AI-generated">
                        AI
                      </span>
                    </div>
                  </th>
                ))
              ) : (
                visibleColumns.has('output') && (
                  <th scope="col" className="px-4 py-2 text-left font-medium text-primary/90 bg-primary/5 border-l border-primary/20">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary/70 flex-shrink-0" aria-hidden="true" />
                      <span>Output</span>
                    </div>
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody style={shouldVirtualize ? { position: 'relative' } : undefined}>
            {/* Show loading state when testing and no results yet */}
            {isTesting && results.length === 0 && (
              <tr>
                <td colSpan={
                  (visibleColumns.has('status') ? 1 : 0) + 
                  columns.filter(col => visibleColumns.has(col)).length + 
                  (outputColumns.length > 0 
                    ? outputColumns.filter(col => visibleColumns.has(col)).length 
                    : (visibleColumns.has('output') ? 1 : 0))
                } className="px-6 py-12 text-center">
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
            {shouldVirtualize ? (
              // Virtualized rendering for large tables
              <>
                <tr>
                  <td colSpan={
                    (visibleColumns.has('status') ? 1 : 0) + 
                    columns.filter(col => visibleColumns.has(col)).length + 
                    (outputColumns.length > 0 
                      ? outputColumns.filter(col => visibleColumns.has(col)).length 
                      : (visibleColumns.has('output') ? 1 : 0))
                  } style={{ height: `${virtualizer.getTotalSize()}px`, padding: 0, border: 0 }}>
                  </td>
                </tr>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const result = results[virtualRow.index]
                  const i = virtualRow.index
                  return (
                    <tr
                      key={result.id}
                      data-index={virtualRow.index}
                      ref={(node) => {
                        if (node) {
                          // Measure and cache row height
                          const height = node.getBoundingClientRect().height
                          if (rowHeightsRef.current.get(virtualRow.index) !== height) {
                            rowHeightsRef.current.set(virtualRow.index, height)
                            virtualizer.measureElement(node)
                          }
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className={`
                        relative border-b border-border
                        hover:bg-accent/40
                        transition-colors duration-150
                        cursor-pointer
                        ${i % 2 === 0 ? 'bg-secondary/40' : 'bg-transparent'}
                      `}
                    >
                      {renderTableRow(result, i)}
                    </tr>
                  )
                })}
              </>
            ) : (
              // Normal rendering for small tables
              results.map((result, i) => (
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
                  {renderTableRow(result, i)}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </>
  )
})
