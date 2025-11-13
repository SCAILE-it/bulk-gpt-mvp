/**
 * Google Sheets URL Tab Component
 * Simple URL paste interface for importing public Google Sheets
 */

import { useState, useCallback } from 'react'
import { FileSpreadsheet, Loader2, AlertCircle, CheckCircle, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { extractSheetId, isValidGoogleSheetsUrl } from '@/lib/google-sheets-url-utils'
import { convertSheetsToCSV } from '@/lib/google-sheets-utils'
import type { ParsedCSV } from '@/lib/types'

interface GoogleSheetsUrlTabProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  onDataLoaded: (data: ParsedCSV) => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
}

export function GoogleSheetsUrlTab({
  csvData,
  fileName,
  isUploading,
  onDataLoaded,
  selectedInputColumns,
  onInputColumnsChange
}: GoogleSheetsUrlTabProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleImport = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a Google Sheets URL')
      return
    }

    if (!isValidGoogleSheetsUrl(url)) {
      setError('Invalid Google Sheets URL. Please paste a valid Google Sheets link.')
      return
    }

    const sheetId = extractSheetId(url)
    if (!sheetId) {
      setError('Could not extract sheet ID from URL. Please check the URL format.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch sheet data from API
      const response = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fetch',
          spreadsheetId: sheetId,
          range: 'A1:Z1000',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Failed to fetch Google Sheet'
        
        // Handle permission/access errors (private sheet)
        if (
          response.status === 403 ||
          errorMessage.includes('PERMISSION_DENIED') ||
          errorMessage.includes('permission') ||
          errorMessage.includes('access denied') ||
          errorMessage.includes('not publicly accessible') ||
          errorMessage.toLowerCase().includes('forbidden')
        ) {
          setError('Sheet is not publicly accessible. Please make sure the sheet is set to "Anyone with the link can view" in Google Sheets sharing settings.')
        } else {
          setError(errorMessage)
        }
        setIsLoading(false)
        return
      }

      const data = await response.json()
      
      if (!data.values || data.values.length === 0) {
        setError('Sheet appears to be empty or no data found.')
        setIsLoading(false)
        return
      }

      // Get sheet name from metadata if available
      let sheetName = `google-sheet-${sheetId.substring(0, 8)}`
      try {
        const metadataResponse = await fetch('/api/google-sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'getMetadata',
            spreadsheetId: sheetId,
          }),
        })
        
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json()
          if (metadata.title) {
            sheetName = metadata.title
          }
        }
      } catch {
        // Ignore metadata fetch errors, use default name
      }

      // Convert to ParsedCSV format
      const parsedCSV = convertSheetsToCSV(data.values, sheetName)
      
      // Clear any previous errors
      setError(null)
      
      // Notify parent
      onDataLoaded(parsedCSV)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import Google Sheet'
      setError(errorMessage)
      console.error('Google Sheets import error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [url, onDataLoaded])

  // Show CSV Preview if data is loaded (same as CSV tab)
  if (csvData && !isUploading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUrl('')
              setError(null)
            }}
            title="Import a different Google Sheet"
            aria-label="Import a different Google Sheet"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Change sheet
          </Button>
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <span className="text-xs text-foreground font-medium">{fileName || 'google-sheet.csv'}</span>
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
      </div>
    )
  }

  // Show URL input form
  return (
    <div className="space-y-3">
      <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-4">
        <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
        <div className="text-center space-y-2 w-full max-w-md">
          <p className="text-sm font-medium text-foreground">Import from Google Sheets</p>
          <p className="text-xs text-muted-foreground">
            Paste your Google Sheets URL below. Make sure the sheet is set to <strong>&quot;Anyone with the link can view&quot;</strong> in sharing settings.
          </p>
        </div>

        <div className="w-full max-w-md space-y-2">
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleImport()
                }
              }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="pl-9 pr-3"
              disabled={isLoading}
              aria-label="Google Sheets URL"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            variant="default"
            size="default"
            onClick={handleImport}
            disabled={!url.trim() || isLoading || isUploading}
            className="w-full"
            aria-label="Import Google Sheet"
          >
            {isLoading || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Import Sheet
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center max-w-md">
          <p className="font-medium mb-1">How to make your sheet public:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-left">
            <li>Open your Google Sheet</li>
            <li>Click &quot;Share&quot; button (top right)</li>
            <li>Change access to &quot;Anyone with the link&quot;</li>
            <li>Set permission to &quot;Viewer&quot;</li>
            <li>Copy the link and paste it above</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

