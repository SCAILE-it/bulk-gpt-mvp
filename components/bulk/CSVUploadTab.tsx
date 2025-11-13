/**
 * CSV Upload Tab Component
 * Handles CSV file upload with drag-and-drop and preview
 */

import { forwardRef, useRef, useImperativeHandle } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle, Loader2 } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Button } from '@/components/ui/button'

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
  const localRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="space-y-3">
      {csvData && (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => localRef.current?.click()}
            title="Upload a different CSV file (⌘O)"
            aria-label="Upload a different CSV file"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Change file
          </Button>
        </div>
      )}

      {csvData && !isUploading ? (
        // Show CSV Preview when file is loaded
        <>
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                <span className="text-xs text-foreground font-medium">{fileName || 'data.csv'}</span>
              </div>
              <span className="text-xs text-muted-foreground" data-testid="row-count-display">
                {csvData.totalRows} rows • {csvData.columns.length} columns
              </span>
            </div>
            <div className="overflow-x-auto max-h-[120px] overflow-y-auto">
              <table className="w-full text-xs">
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
                      className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? 'bg-muted/10' : 'bg-transparent'}`}
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
              <div className="px-3 py-1.5 border-t border-border text-xs text-muted-foreground bg-muted/20">
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
          className={`border border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/30 bg-transparent'
          }`}
        >
          <input {...getInputProps()} ref={localRef} className="hidden" data-testid="file-input" />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              <p className="text-xs text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              <Upload className={`h-5 w-5 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-xs text-muted-foreground">
                {isDragActive ? 'Drop CSV file here' : 'Drop CSV file or click to browse'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

