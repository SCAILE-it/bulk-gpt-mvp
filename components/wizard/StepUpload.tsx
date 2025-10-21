/**
 * ABOUTME: Step 1 of wizard - CSV file upload with validation and preview
 * ABOUTME: Supports drag-and-drop, shows headers/rows, validates file format and size
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Upload, FileText, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface CSVData {
  file: File
  headers: string[]
  rowCount: number
  preview: string[][]
}

export interface StepUploadProps {
  onNext: (data: CSVData) => void
}

export default function StepUpload({ onNext }: StepUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [showJSON, setShowJSON] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = useCallback(async (file: File): Promise<CSVData | null> => {
    try {
      // Use FileReader for better test environment compatibility
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => {
          const error = reader.error || new Error('Failed to read file')
          // Detect specific error types
          if (error.name === 'QuotaExceededError') {
            reject(new Error('File is too large for browser memory'))
          } else {
            reject(new Error('Error reading file: ' + error.message))
          }
        }
        reader.addEventListener('error', () => {
          const error = reader.error || new Error('Failed to read file')
          if (error.name === 'QuotaExceededError') {
            reject(new Error('File is too large for browser memory'))
          } else {
            reject(new Error('Error reading file: ' + error.message))
          }
        })
        reader.readAsText(file)
      })

      // Remove BOM (Byte Order Mark) if present
      const cleanText = text.replace(/^\uFEFF/, '')

      if (!cleanText || cleanText.trim() === '') {
        throw new Error('No data found in file - file appears to be empty')
      }

      // Handle both CRLF (\r\n) and LF (\n) line endings
      const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '')

      if (lines.length === 0) {
        throw new Error('No data rows found in file')
      }

      // Parse CSV line with proper handling of quoted fields
      const parseLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]

          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }

        result.push(current.trim())
        return result.map(field => field.replace(/^"|"$/g, ''))
      }

      const headers = parseLine(lines[0])
      const dataRows = lines.slice(1).map(parseLine)

      if (headers.length === 0 || headers.every(h => !h)) {
        throw new Error('No valid headers found in CSV file')
      }

      // Filter out empty rows (all cells are empty/whitespace)
      const validDataRows = dataRows.filter(row =>
        row.some(cell => cell.trim() !== '')
      )

      if (validDataRows.length === 0) {
        throw new Error('No data rows found - file only contains whitespace')
      }

      return {
        file,
        headers,
        rowCount: validDataRows.length,
        preview: validDataRows.slice(0, 5), // First 5 rows for preview
      }
    } catch (error) {
      // Re-throw error to be caught by validateAndParseFile
      throw error instanceof Error ? error : new Error('Unknown parsing error')
    }
  }, [])

  const validateAndParseFile = useCallback(async (file: File) => {
    setError(null)
    setIsParsing(true)

    try{
      // Validate file type
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError('Only CSV files are accepted')
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum 10MB allowed')
        return
      }

      // Validate file is not empty
      if (file.size === 0) {
        setError('File is empty. Please upload a file with data')
        return
      }

      // Parse CSV (will throw on error)
      const parsedData = await parseCSV(file)

      if (!parsedData) {
        setError('No headers found in CSV file')
        return
      }

      setFile(file)
      setCsvData(parsedData)
    } catch (error) {
      // Catch errors from parseCSV and display them
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred while processing the file')
      }
    } finally {
      setIsParsing(false)
    }
  }, [parseCSV])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      await validateAndParseFile(selectedFile)
    }
  }, [validateAndParseFile])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      await validateAndParseFile(droppedFile)
    }
  }, [validateAndParseFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleRemoveFile = useCallback(() => {
    setFile(null)
    setCsvData(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleNext = useCallback(() => {
    if (csvData) {
      onNext(csvData)
    }
  }, [csvData, onNext])

  return (
    <div className="max-w-4xl space-y-6 p-4">
      {/* Error Message - Always at top if present */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Upload State - Transform to Preview */}
      {isParsing ? (
        /* Parsing Loading State */
        <Card className="border-2 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-base font-medium">Parsing CSV file...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        </Card>
      ) : !file ? (
        /* Upload Dropzone */
        <Card
          data-testid="upload-dropzone"
          className={cn(
            'relative border shadow-sm p-6 transition-all duration-200',
            isDragOver
              ? 'border-primary bg-primary/10 scale-[1.02] shadow-xl ring-2 ring-primary/30'
              : 'border-border hover:border-primary/50 hover:bg-accent/50 hover:shadow-xl'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              'transition-transform duration-200',
              isDragOver && 'scale-110'
            )}>
              <FileSpreadsheet
                className={cn(
                  'h-16 w-16 transition-colors',
                  isDragOver ? 'text-primary' : 'text-muted-foreground'
                )}
                data-testid="upload-icon"
                aria-hidden="true"
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold font-mono text-gray-900 dark:text-gray-100">
                {isDragOver ? 'Drop CSV' : 'FILE UPLOAD'}
              </h2>
              <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                {isDragOver ? 'Release to upload' : 'Drop CSV or click Browse'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>50MB max</span>
              <span>•</span>
              <span>10K rows</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
              aria-label="Upload CSV file"
            />

            <Button
              variant="default"
              size="default"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2"
              disabled={isDragOver}
            >
              <Upload className="mr-2 h-4 w-4" />
              Browse Files <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-background/20 rounded font-mono">⌘O</kbd>
            </Button>
          </div>
        </Card>
      ) : (
        /* Preview State - Same page transformed */
        <div className="space-y-6">
          {/* File Info Header - Power User Style */}
          <div className="flex items-center justify-between p-6 rounded-lg border bg-card">
            <div className="flex items-center gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg text-gray-900 dark:text-gray-100 font-mono">✓ {file.name}</p>
                <div className="flex items-center gap-4">
                  {/* Large prominent row count */}
                  <span
                    data-testid="row-count"
                    aria-label={`${csvData.rowCount.toLocaleString()} rows`}
                    className="text-5xl font-bold font-mono text-primary"
                  >
                    {csvData.rowCount.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    rows • {csvData.headers.length} columns
                  </span>
                </div>
              </div>
            </div>

            {/* Raw JSON Toggle */}
            <Button
              variant={showJSON ? "default" : "outline"}
              onClick={() => setShowJSON(!showJSON)}
              size="sm"
            >
              {showJSON ? 'Preview' : 'Raw JSON'}
            </Button>
          </div>

          {/* Preview Section - Conditional: Table or JSON */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 font-mono">
              {showJSON ? 'JSON View:' : 'Preview (first 5 rows):'}
            </h3>
            <Card className="p-6">
              {showJSON ? (
                /* JSON View */
                <pre className="overflow-x-auto text-xs font-mono bg-muted p-4 rounded">
                  {JSON.stringify({
                    file: file.name,
                    size: file.size,
                    headers: csvData.headers,
                    rowCount: csvData.rowCount,
                    preview: csvData.preview
                  }, null, 2)}
                </pre>
              ) : (
                /* Table View - Monospace */
                <div className="overflow-x-auto" data-testid="csv-preview">
                  <table className="w-full text-sm font-mono">
                    <thead>
                      <tr className="border-b">
                        {csvData.headers.map((header, index) => (
                          <th
                            key={index}
                            className="px-4 py-2 text-left font-semibold"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.preview.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b last:border-0">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-2 text-muted-foreground"
                            >
                              {cell || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={handleRemoveFile}
              size="lg"
            >
              Upload Different
            </Button>
            <Button
              onClick={handleNext}
              size="lg"
            >
              Continue →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
