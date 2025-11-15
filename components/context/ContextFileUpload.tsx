'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, FileSpreadsheet, File, X, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useContextFiles } from '@/hooks/useContextFiles'

const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function getFileIcon(type: string) {
  if (type.includes('csv') || type.includes('spreadsheet') || type.includes('excel')) {
    return FileSpreadsheet
  }
  if (type.includes('pdf')) {
    return FileText
  }
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ContextFileUpload() {
  const { files, isLoading, uploadFile, deleteFile } = useContextFiles()
  const [uploading, setUploading] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        continue // Error toast handled by uploadFile
      }

      setUploading(file.name)
      try {
        await uploadFile(file)
      } catch (error) {
        // Error handled by uploadFile
      } finally {
        setUploading(null)
      }
    }
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    multiple: true,
    maxSize: MAX_FILE_SIZE,
  })

  const removeFile = useCallback(async (fileId: string) => {
    try {
      await deleteFile(fileId)
    } catch (error) {
      // Error handled by deleteFile
    }
  }, [deleteFile])

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground mb-4">
        Upload files to use as context in your Bulk Agent prompts. Supported formats: CSV, XLSX, PDF, DOCX
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/20'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-muted-foreground">
          or click to browse • Max 10MB per file
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          CSV, XLSX, PDF, DOCX
        </p>
      </div>

      {/* Loading State */}
      {isLoading && files.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-xs">Loading files...</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium">Uploaded Files ({files.length})</h3>
          <div className="space-y-2">
            {files.map((file) => {
              const Icon = getFileIcon(file.type)
              const isFileUploading = uploading === file.name

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-secondary/40 border border-border rounded-lg"
                >
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                    </p>
                  </div>
                  {isFileUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="h-6 w-6 p-0 flex-shrink-0"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && files.length === 0 && !isDragActive && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-xs">No files uploaded yet</p>
          <p className="text-xs mt-1">Upload files to use them as context in your prompts</p>
        </div>
      )}
    </div>
  )
}

