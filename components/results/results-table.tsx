'use client'

import React, { useState, useMemo } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface ResultRow {
  id: string
  input: string | Record<string, string>
  output: string
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
}

interface ResultsTableProps {
  results: ResultRow[]
  loading?: boolean
  error?: string
  pageSize?: number
}

export function ResultsTable({
  results,
  loading = false,
  error,
  pageSize = 10,
}: ResultsTableProps): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleExpandedRow = (rowId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId)
    } else {
      newExpanded.add(rowId)
    }
    setExpandedRows(newExpanded)
  }

  // Filter results based on search term
  const filteredResults = useMemo(() => {
    return results.filter(result => {
      const inputStr = typeof result.input === 'string' ? result.input : JSON.stringify(result.input)
      return (
        inputStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.output.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }, [results, searchTerm])

  // Paginate results
  const totalPages = Math.ceil(filteredResults.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedResults = filteredResults.slice(
    startIndex,
    startIndex + pageSize
  )

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-muted-foreground">
        Loading results...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-muted-foreground">
        No results yet. Upload a CSV and start processing.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search results..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          setCurrentPage(1)
        }}
        className="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground"
      />

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {paginatedResults.length} of {filteredResults.length} results
        {filteredResults.length !== results.length && (
          <span> (filtered from {results.length})</span>
        )}
      </div>

      {/* Empty State for Search Results */}
      {filteredResults.length === 0 && results.length > 0 && (
        <EmptyState
          icon={Search}
          title="No results found"
          description={`No results match "${searchTerm}". Try adjusting your search.`}
          clearFilter={{
            label: "Clear search",
            onClick: () => {
              setSearchTerm('')
              setCurrentPage(1)
            }
          }}
          size="sm"
          variant="search"
        />
      )}

      {/* Results Table */}
      {filteredResults.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Row
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Input
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Output
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((result, index) => (
                  <React.Fragment key={result.id}>
                    <tr className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-2 text-muted-foreground">
                        {startIndex + index + 1}
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-foreground">
                        {typeof result.input === 'string' ? result.input : JSON.stringify(result.input)}
                      </td>
                      <td className="max-w-sm truncate px-4 py-2 text-foreground">
                        {result.output}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => result.status === 'error' && toggleExpandedRow(result.id)}
                          className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium min-h-[36px] ${
                            result.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer'
                          }`}
                          disabled={result.status !== 'error'}
                        >
                          {result.status === 'success' ? '✓ Success' : '✗ Error'}
                          {result.status === 'error' && (
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${
                                expandedRows.has(result.id) ? 'rotate-180' : ''
                              }`}
                            />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Error Details Row */}
                    {result.status === 'error' && expandedRows.has(result.id) && result.error && (
                      <tr className="border-b border-border bg-red-50 dark:bg-red-950/20">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-red-700 dark:text-red-400 flex-shrink-0 pt-0.5">Error Details:</span>
                              <div className="text-xs text-red-600 dark:text-red-300 bg-white dark:bg-red-950/40 rounded p-2 flex-1 font-mono break-words">
                                {result.error}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-border bg-background px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-border bg-background px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

