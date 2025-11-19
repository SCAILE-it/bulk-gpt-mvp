/**
 * CSV Upload Tab Component
 * Handles CSV file upload with drag-and-drop and preview
 */

import { forwardRef, useRef, useImperativeHandle, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from './SkeletonLoader'

interface CSVUploadTabProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  onFileUpload: (file: File) => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
}

export const CSVUploadTab = forwardRef<HTMLInputElement, CSVUploadTabProps>(function CSVUploadTab({
  csvData,
  fileName,
  isUploading,
  onFileUpload,
  selectedInputColumns,
  onInputColumnsChange
}, forwardedRef) {
  const localRef = useRef<HTMLInputElement | null>(null)

  useImperativeHandle(forwardedRef, () => localRef.current as HTMLInputElement)

  const { getRootProps, getInputProps, isDragActive, open, fileRejections } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) onFileUpload(acceptedFiles[0])
    },
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
    noClick: false,
    noKeyboard: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  // Get input props - react-dropzone handles the ref internally
  const inputProps = getInputProps()
  
  // Sync our ref with the actual input element using useEffect
  useEffect(() => {
    // Find the input element by data-testid after react-dropzone attaches it
    const input = document.querySelector('[data-testid="file-input"]') as HTMLInputElement | null
    if (input) {
      localRef.current = input
    }
  }, [csvData, isUploading])

  return (
    <div className="space-y-3">
      {csvData && (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              open()
            }}
            title="Upload a different CSV file (⌘O)"
            aria-label="Upload a different CSV file"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Change file
          </Button>
        </div>
      )}

      {isUploading ? (
        // Show Skeleton Loader while uploading/parsing
        <SkeletonLoader rows={5} columns={4} />
      ) : csvData && csvData.rows.length > 0 ? (
        // Show CSV Preview when file is loaded and has data
        <>
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs text-foreground font-medium">{fileName || 'data.csv'}</span>
                </div>
                <span className="text-xs text-muted-foreground" data-testid="row-count-display">
                  {csvData.totalRows} rows • {csvData.columns.length} columns
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[120px] overflow-y-auto -mx-1 sm:mx-0">
              <div className="min-w-full inline-block">
                <table className="w-full text-xs min-w-[500px] sm:min-w-0">
                  <thead className="sticky top-0 bg-muted/40 border-b border-border">
                    <tr>
                      {csvData.columns.map(col => {
                        const isSelected = selectedInputColumns?.includes(col) ?? true
                        return (
                          <th key={col} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
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
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-border text-primary focus:ring-1 focus:ring-ring cursor-pointer touch-manipulation"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Toggle ${col} column`}
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
                        className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-muted/10' : 'bg-transparent'}`}
                      >
                        {csvData.columns.map(col => {
                          const isSelected = selectedInputColumns?.includes(col) ?? true
                          const cellValue = row.data[col]
                          const isEmpty = !cellValue || !cellValue.trim()
                          return (
                            <td 
                              key={col} 
                              className={`px-2 py-1.5 sm:py-1 font-mono text-xs whitespace-nowrap ${
                                !isSelected ? 'opacity-30' : isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
                              }`}
                            >
                              {isEmpty ? (
                                <span className="italic" aria-label="Empty cell">(empty)</span>
                              ) : (
                                <span className="block max-w-[200px] sm:max-w-none truncate sm:whitespace-normal" title={cellValue}>
                                  {cellValue}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {csvData.totalRows > 5 && (
              <div className="px-3 py-1.5 border-t border-border text-xs text-muted-foreground bg-muted/20">
                Showing first 5 of {csvData.totalRows} rows
              </div>
            )}
            </div>
          </div>
          <input {...inputProps} className="hidden" data-testid="file-input" />
        </>
      ) : (
        // Show Upload Dropzone when no file and not uploading
        <div
          {...getRootProps()}
          className={`border border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/30 bg-transparent'
          }`}
        >
          <input {...inputProps} className="hidden" data-testid="file-input" />
          <div className="flex flex-col items-center gap-2 w-full">
            <Upload className={`h-5 w-5 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-xs text-muted-foreground">
              {isDragActive ? 'Drop CSV file here' : 'Drop CSV file or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Max 10MB • CSV format only
            </p>
          </div>
          {fileRejections.length > 0 && (
            <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              {fileRejections.map(({ file, errors }) => (
                <div key={file.name}>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-red-300/60 text-[10px] mb-1">
                    File size: {(file.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                  {errors.map((e) => (
                    <p key={e.code} className="text-red-300/80">
                      {e.code === 'file-too-large'
                        ? `File too large. Maximum: 10MB`
                        : e.code === 'file-invalid-type'
                        ? 'Only CSV files are accepted'
                        : e.message}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

