/**
 * ABOUTME: File upload section with drag-and-drop, CSV preview, and error handling
 * ABOUTME: Manages dropzone state and displays uploaded CSV data in a preview table
 */

import { forwardRef, useRef, useImperativeHandle } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface FileUploadSectionProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  onFileUpload: (file: File) => void
  onGoogleSheetsUpload?: () => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
}

export const FileUploadSection = forwardRef<HTMLInputElement, FileUploadSectionProps>(function FileUploadSection({
  csvData,
  fileName,
  isUploading,
  onFileUpload,
  onGoogleSheetsUpload,
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
        <div className="flex items-center justify-end gap-2">
          {onGoogleSheetsUpload && (
            <Button
              variant="brand"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onGoogleSheetsUpload()
              }}
              title="Import from Google Sheets"
              aria-label="Import from Google Sheets"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              Google Sheets
            </Button>
          )}
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
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-foreground font-medium">{fileName || 'data.csv'}</span>
              </div>
              <span className="text-xs text-muted-foreground" data-testid="row-count-display">
                {csvData.totalRows} rows • {csvData.columns.length} columns
              </span>
            </div>
            <div className="overflow-x-auto max-h-[140px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/50 border-b border-border backdrop-blur-sm">
                  <tr>
                    {csvData.columns.map(col => {
                      const isSelected = selectedInputColumns?.includes(col) ?? true
                      return (
                        <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
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
                      className={`border-b border-border/50 last:border-0 ${i % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'}`}
                    >
                      {csvData.columns.map(col => {
                        const isSelected = selectedInputColumns?.includes(col) ?? true
                        return (
                          <td 
                            key={col} 
                            className={`px-3 py-1.5 text-foreground font-mono text-xs whitespace-nowrap ${
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
              <div className="px-4 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground">
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
          className={`border-2 border-dashed rounded-lg p-6 min-h-[100px] flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
            isDragActive
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50'
          }`}
        >
          <input {...getInputProps()} ref={localRef} className="hidden" data-testid="file-input" />
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
              <p className="text-sm text-foreground font-medium">Uploading and parsing...</p>
            </>
          ) : (
            <>
              <Upload className={`h-8 w-8 mx-auto mb-3 ${isDragActive ? 'text-primary' : 'text-muted-foreground'} transition-colors`} />
              <p className="text-sm text-foreground font-medium mb-4">
                {isDragActive ? 'Drop here' : 'Drop CSV file or click to browse'}
              </p>
              <div className="flex gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    localRef.current?.click()
                  }}
                  aria-label="Browse for CSV file to upload"
                >
                  Browse Files
                </Button>
                {onGoogleSheetsUpload && (
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onGoogleSheetsUpload()
                    }}
                    aria-label="Import from Google Sheets"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Google Sheets
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Upload feedback */}
      {/* Errors are displayed at the top level in BulkProcessor, not here */}
    </div>
  )
})
