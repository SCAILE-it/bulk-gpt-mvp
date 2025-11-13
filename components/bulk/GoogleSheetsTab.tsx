/**
 * Google Sheets Tab Component
 * Handles Google Sheets import with lazy script loading
 */

import { useState, useEffect, useCallback } from 'react'
import { FileSpreadsheet, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGoogleSheets } from '@/hooks/useGoogleSheets'
import { convertSheetsToCSV } from '@/lib/google-sheets-utils'
import type { ParsedCSV } from '@/lib/types'

interface GoogleSheetsTabProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  onDataLoaded: (data: ParsedCSV) => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
}

declare global {
  interface Window {
    gapi?: any
    google?: any
  }
}

export function GoogleSheetsTab({
  csvData,
  fileName,
  isUploading,
  onDataLoaded,
  selectedInputColumns,
  onInputColumnsChange
}: GoogleSheetsTabProps) {
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [scriptsLoading, setScriptsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const googleSheets = useGoogleSheets()

  // Lazy load Google API scripts only when tab is active
  useEffect(() => {
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    
    if (!GOOGLE_CLIENT_ID) {
      setLoadError('Google Sheets integration not configured')
      return
    }

    // Check if scripts already loaded
    if (window.gapi && window.google?.picker) {
      setScriptsLoaded(true)
      return
    }

    setScriptsLoading(true)
    setLoadError(null)

    // Load Google API script
    const gapiScript = document.createElement('script')
    gapiScript.src = 'https://apis.google.com/js/api.js'
    gapiScript.async = true
    gapiScript.defer = true
    
    // Load Google Picker script
    const pickerScript = document.createElement('script')
    pickerScript.src = 'https://apis.google.com/js/picker.js'
    pickerScript.async = true
    pickerScript.defer = true
    
    let gapiLoaded = false
    let pickerLoaded = false
    
    const checkLoaded = () => {
      if (gapiLoaded && pickerLoaded && window.gapi && window.google?.picker) {
        setScriptsLoaded(true)
        setScriptsLoading(false)
      }
    }
    
    gapiScript.onload = () => {
      gapiLoaded = true
      checkLoaded()
    }
    gapiScript.onerror = () => {
      setLoadError('Failed to load Google API')
      setScriptsLoading(false)
    }
    
    pickerScript.onload = () => {
      pickerLoaded = true
      checkLoaded()
    }
    pickerScript.onerror = () => {
      setLoadError('Failed to load Google Picker API')
      setScriptsLoading(false)
    }
    
    document.body.appendChild(gapiScript)
    document.body.appendChild(pickerScript)

    return () => {
      // Cleanup if component unmounts
    }
  }, [])

  const handleImport = useCallback(async () => {
    if (!scriptsLoaded) {
      setLoadError('Google API scripts not loaded yet')
      return
    }

    try {
      // Initialize if needed
      if (!googleSheets.isInitialized) {
        await googleSheets.initialize()
      }

      // Authenticate if needed
      if (!googleSheets.isAuthenticated) {
        await googleSheets.authenticate()
        if (!googleSheets.isAuthenticated) {
          return // User cancelled
        }
      }

      // Pick a sheet
      const sheet = await googleSheets.pickSheet()
      if (!sheet) {
        return // User cancelled
      }

      // Fetch sheet data
      const values = await googleSheets.fetchSheetData(sheet.id)
      
      // Convert to ParsedCSV format
      const parsedCSV = convertSheetsToCSV(values, sheet.name)
      
      // Clear any previous errors
      setLoadError(null)
      
      // Notify parent (parent will handle loading state)
      onDataLoaded(parsedCSV)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to import Google Sheet')
    }
  }, [scriptsLoaded, googleSheets, onDataLoaded])

  // Show error state
  if (loadError && !scriptsLoaded) {
    return (
      <div className="space-y-3">
        <div className="border border-destructive/50 rounded-md p-4 bg-destructive/10">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{loadError}</span>
          </div>
        </div>
      </div>
    )
  }

  // Show CSV Preview if data is loaded (same as CSV tab)
  if (csvData && !isUploading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleImport}
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

  // Show loading or import button
  return (
    <div className="space-y-3">
      {scriptsLoading ? (
        <div className="border border-dashed rounded-md p-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Loading Google Sheets integration...</p>
        </div>
      ) : isUploading ? (
        <div className="border border-dashed rounded-md p-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Importing from Google Sheets...</p>
        </div>
      ) : (
        <div className="border border-dashed rounded-md p-8 flex flex-col items-center justify-center gap-4">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-foreground">Import from Google Sheets</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Connect your Google account and select a spreadsheet to import. Your data will be processed the same way as CSV uploads.
            </p>
          </div>
          <Button
            variant="default"
            size="default"
            onClick={handleImport}
            disabled={!scriptsLoaded || googleSheets.isLoading}
            aria-label="Import from Google Sheets"
          >
            {googleSheets.isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Import from Google Sheets
              </>
            )}
          </Button>
          {googleSheets.error && (
            <div className="mt-2 text-xs text-destructive text-center max-w-sm">
              {googleSheets.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

