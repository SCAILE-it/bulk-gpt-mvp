/**
 * ABOUTME: CSV preview table component - shows first 5 rows of uploaded CSV data
 * ABOUTME: Used in right panel before batch processing starts
 */

'use client'

import { Table2 } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'

interface CSVPreviewTableProps {
  csvData: ParsedCSV
  maxRows?: number
}

export function CSVPreviewTable({ csvData, maxRows = 5 }: CSVPreviewTableProps) {
  const { columns, rows } = csvData
  const previewRows = rows.slice(0, maxRows)
  const remainingRows = Math.max(0, rows.length - maxRows)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Table2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-medium text-zinc-100">CSV Preview</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              {rows.length} row{rows.length !== 1 ? 's' : ''} • {columns.length} column{columns.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="border border-white/5 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-white/5 w-12">
                  #
                </th>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider border-b border-white/5"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No data rows found in CSV. Please check your file format.
                  </td>
                </tr>
              ) : (
                previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
                      {rowIndex + 1}
                    </td>
                    {columns.map((column) => {
                      const value = row.data?.[column] ?? ''
                      const isEmpty = !value || value.trim() === ''
                      return (
                        <td
                          key={column}
                          className="px-4 py-3 text-sm text-zinc-200 max-w-xs truncate"
                          title={value || ''}
                        >
                          {isEmpty ? <span className="text-zinc-600 italic">—</span> : value}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Remaining rows indicator */}
          {remainingRows > 0 && (
            <div className="px-4 py-3 bg-zinc-900/30 border-t border-white/5 text-center">
              <p className="text-xs text-zinc-500">
                + {remainingRows} more row{remainingRows !== 1 ? 's' : ''} (showing first {maxRows})
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
