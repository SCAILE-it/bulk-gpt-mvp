/**
 * ABOUTME: File upload section with drag-and-drop, CSV preview, and error handling
 * ABOUTME: Manages dropzone state and displays uploaded CSV data in a preview table
 */

import { forwardRef, useRef, useImperativeHandle } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { ParsedCSV } from '@/lib/types'

interface FileUploadSectionProps {
  csvData: ParsedCSV | null
  fileName?: string
  errors: (string | null)[]
  isUploading: boolean
  onFileUpload: (file: File) => void
}

export const FileUploadSection = forwardRef<HTMLInputElement, FileUploadSectionProps>(function FileUploadSection({
  csvData,
  fileName,
  errors,
  isUploading,
  onFileUpload
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

  const errorMessage = errors.find(e => e) || null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-300">Dataset</label>
        {csvData && (
          <button
            onClick={() => localRef.current?.click()}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded text-xs text-zinc-300 transition-all flex items-center gap-1.5 active:scale-95"
            title="Upload a different CSV file (⌘O)"
            aria-label="Upload a different CSV file"
          >
            <Upload className="h-3 w-3" aria-hidden="true" />
            Change file
          </button>
        )}
      </div>

      {csvData && !isUploading ? (
        // Show CSV Preview when file is loaded
        <>
          <div className="border border-white/5 rounded-lg overflow-hidden bg-zinc-900/40">
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                <span className="text-xs text-zinc-300 font-medium">{fileName || 'data.csv'}</span>
              </div>
              <span className="text-xs text-zinc-500" data-testid="row-count-display">
                {csvData.totalRows} rows • {csvData.columns.length} columns
              </span>
            </div>
            <div className="overflow-x-auto max-h-[120px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900/95 border-b border-white/5">
                  <tr>
                    {csvData.columns.map(col => (
                      <th key={col} className="px-2 py-1 text-left font-medium text-zinc-400 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.rows.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? 'bg-zinc-900/40' : 'bg-transparent'}`}
                    >
                      {csvData.columns.map(col => (
                        <td key={col} className="px-2 py-1 text-zinc-300 font-mono text-xs whitespace-nowrap">
                          {row.data[col] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvData.totalRows > 5 && (
              <div className="px-3 py-1.5 bg-zinc-900/60 border-t border-white/5 text-xs text-zinc-500">
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
              ? 'border-white/20 bg-white/5 scale-[1.02]'
              : 'border-white/10 hover:border-white/15 bg-zinc-900/30 hover:bg-zinc-900/50 active:scale-[0.98]'
          }`}

        >
          <input {...getInputProps()} ref={localRef} className="hidden" data-testid="file-input" />
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto mb-2 text-zinc-400 animate-spin" />
              <p className="text-sm text-zinc-300 font-medium">Uploading and parsing...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
              <p className="text-sm text-zinc-200 font-medium mb-1">
                {isDragActive ? 'Drop here' : 'Drop your CSV file here'}
              </p>
              <p className="text-xs text-zinc-300 mb-2">or</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  localRef.current?.click()
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-md text-sm font-medium text-zinc-200 transition-all active:scale-95"
                aria-label="Browse for CSV file to upload"
              >
                Browse Files
              </button>
              <p className="text-xs text-zinc-500 mt-3">
                Max 10MB • CSV format • Up to 1,000 rows
              </p>
              <a
                href="/sample.csv"
                download
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-zinc-400 hover:text-zinc-300 mt-2 inline-flex items-center gap-1 hover:underline"
                aria-label="Download sample CSV template"
              >
                Download sample template →
              </a>
            </>
          )}
        </div>
      )}

      {/* Upload feedback */}
      {errorMessage && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md">
          <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{errorMessage}</p>
        </div>
      )}
    </div>
  )
})
