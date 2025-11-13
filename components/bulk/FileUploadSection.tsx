/**
 * ABOUTME: File upload section with drag-and-drop, CSV preview, and error handling
 * ABOUTME: Manages dropzone state and displays uploaded CSV data in a preview table
 */

import { forwardRef, useRef, useImperativeHandle } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle, Loader2 } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'

interface FileUploadSectionProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  onFileUpload: (file: File) => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
}

export const FileUploadSection = forwardRef<HTMLInputElement, FileUploadSectionProps>(function FileUploadSection({
  csvData,
  fileName,
  isUploading,
  onFileUpload,
  selectedInputColumns,
  onInputColumnsChange
}, forwardedRef) {
  const localRef = useRef<HTMLInputElement>(null)

  // Merge local ref with forwarded ref
  useImperativeHandle(forwardedRef, () => localRef.current as HTMLInputElement)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) onFileUpload(acceptedFiles[0])
    },
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
    noClick: false,
    noKeyboard: false,
  })

  // Errors are handled at parent level (BulkProcessor), not displayed here

  return (
    <div className="space-y-3">
      {csvData && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => localRef.current?.click()}
            className="px-2.5 py-1.5 bg-accent hover:bg-accent border border-border rounded-md text-xs text-foreground transition-all flex items-center gap-1.5 active:scale-95"
            title="Upload a different CSV file (⌘O)"
            aria-label="Upload a different CSV file"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Change file
          </button>
        </div>
      )}

      {csvData && !isUploading ? (
        // Show CSV Preview when file is loaded
        <>
          <div className="border border-border rounded-lg overflow-hidden bg-secondary/40">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-secondary/60">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                <span className="text-xs text-foreground font-medium">{fileName || 'data.csv'}</span>
              </div>
              <span className="text-xs text-muted-foreground" data-testid="row-count-display">
                {csvData.totalRows} rows • {csvData.columns.length} columns
              </span>
            </div>
            <div className="overflow-x-auto max-h-[120px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-secondary/95 border-b border-border">
                  <tr>
                    {csvData.columns.map(col => {
                      const isSelected = selectedInputColumns?.includes(col) ?? true
                      return (
                        <th key={col} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (!onInputColumnsChange || !csvData) return
                                const newSelection = e.target.checked
                                  ? [...(selectedInputColumns || csvData.columns), col]
                                  : (selectedInputColumns || csvData.columns).filter(c => c !== col)
                                onInputColumnsChange(newSelection)
                              }}
                              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-1 focus:ring-ring cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className={!isSelected ? 'opacity-50' : ''}>{col}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {csvData.rows.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-secondary/40' : 'bg-transparent'}`}
                    >
                      {csvData.columns.map(col => {
                        const isSelected = selectedInputColumns?.includes(col) ?? true
                        return (
                          <td 
                            key={col} 
                            className={`px-2 py-1 text-foreground font-mono text-xs whitespace-nowrap ${
                              !isSelected ? 'opacity-30' : ''
                            }`}
                          >
                            {row.data[col] || '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvData.totalRows > 5 && (
              <div className="px-3 py-1.5 bg-secondary/60 border-t border-border text-xs text-muted-foreground">
                Showing first 5 of {csvData.totalRows} rows
              </div>
            )}
          </div>
          <input {...getInputProps()} ref={localRef} className="hidden" data-testid="file-input" />
        </>
      ) : (
        // Show Upload Dropzone when no file or uploading
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-3 min-h-[80px] flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
            isDragActive
              ? 'border-border bg-white/5 scale-[1.02]'
              : 'border-border hover:border-border bg-secondary/30 hover:bg-secondary/50 active:scale-[0.98]'
          }`}

        >
          <input {...getInputProps()} ref={localRef} className="hidden" data-testid="file-input" />
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
              <p className="text-sm text-foreground font-medium">Uploading and parsing...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground font-medium mb-2">
                {isDragActive ? 'Drop here' : 'Drop CSV file or click to browse'}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  localRef.current?.click()
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-border rounded-md text-sm font-medium text-foreground transition-all active:scale-95"
                aria-label="Browse for CSV file to upload"
              >
                Browse Files
              </button>
            </>
          )}
        </div>
      )}

      {/* Upload feedback */}
      {/* Errors are displayed at the top level in BulkProcessor, not here */}
    </div>
  )
})
