/**
 * Google Sheets URL Tab Component
 * Simple URL paste interface for importing public Google Sheets
 */

import { useState, useCallback, useEffect } from 'react'
import { FileSpreadsheet, Loader2, AlertCircle, CheckCircle, Link2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { extractSheetId, isValidGoogleSheetsUrl } from '@/lib/google-sheets-url-utils'
import { convertSheetsToCSV } from '@/lib/google-sheets-utils'
import { getGoogleAccessToken, getStoredGoogleToken, storeGoogleToken, isGoogleTokenValid } from '@/lib/auth/google-sheets'
import { logError } from '@/lib/errors'
import type { ParsedCSV } from '@/lib/types'

interface GoogleSheetsUrlTabProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  onDataLoaded: (data: ParsedCSV) => void
  onClearData?: () => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
}

interface PickerResponse {
  [key: string]: unknown
  DOCUMENTS?: Array<{
    id: string
    name: string
    url?: string
  }>
}

export function GoogleSheetsUrlTab({
  csvData,
  fileName,
  isUploading,
  onDataLoaded,
  onClearData,
  selectedInputColumns,
  onInputColumnsChange
}: GoogleSheetsUrlTabProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPickerLoading, setIsPickerLoading] = useState(false)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)

  // Load Google Picker API script
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if Client ID is available
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
                     process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID
    if (!clientId) {
      console.error('[Google Sheets] Client ID not found. Check environment variables.')
      setError('Google Sheets integration not configured. Please contact support.')
      return
    }

    // Check if already loaded
    if (window.google?.picker && window.google?.accounts?.oauth2) {
      setScriptsLoaded(true)
      return
    }

    // Load Google Identity Services (for OAuth)
    const gsiScript = document.createElement('script')
    gsiScript.src = 'https://accounts.google.com/gsi/client'
    gsiScript.async = true
    gsiScript.defer = true

    // Load Google Picker API
    const pickerScript = document.createElement('script')
    pickerScript.src = 'https://apis.google.com/js/picker.js'
    pickerScript.async = true
    pickerScript.defer = true

    let gsiLoaded = false
    let pickerLoaded = false
    let checkAttempts = 0
    const maxAttempts = 50 // 5 seconds max wait

    const checkLoaded = () => {
      checkAttempts++
      
      // Check if both scripts loaded AND APIs are available
      if (gsiLoaded && pickerLoaded) {
        // Give Google APIs a moment to initialize
        if (window.google?.picker && window.google?.accounts?.oauth2) {
          setScriptsLoaded(true)
          return
        }
        
        // If not ready yet, wait a bit more (up to 5 seconds)
        if (checkAttempts < maxAttempts) {
          setTimeout(checkLoaded, 100)
        } else {
          console.error('[Google Sheets] Scripts loaded but APIs not initialized')
          setError('Google Sheets integration failed to initialize. Please refresh the page.')
        }
      }
    }

    gsiScript.onload = () => {
      gsiLoaded = true
      checkLoaded()
    }
    
    gsiScript.onerror = () => {
      console.error('[Google Sheets] Failed to load Google Identity Services')
      setError('Failed to load Google authentication. Please check your internet connection and try again.')
    }

    pickerScript.onload = () => {
      pickerLoaded = true
      checkLoaded()
    }
    
    pickerScript.onerror = () => {
      console.error('[Google Sheets] Failed to load Google Picker API')
      setError('Failed to load Google Picker. Please check your internet connection and try again.')
    }

    document.head.appendChild(gsiScript)
    document.head.appendChild(pickerScript)

    return () => {
      // Cleanup if component unmounts
    }
  }, [])

  // Handle Google Picker selection
  const handlePickFromDrive = useCallback(async () => {
    if (!scriptsLoaded) {
      setError('Google Picker API not loaded yet. Please wait a moment and try again.')
      return
    }

    setIsPickerLoading(true)
    setError(null)

    try {
      // Get or request Google access token
      let accessToken = getStoredGoogleToken()
      if (!accessToken || !isGoogleTokenValid()) {
        const authResult = await getGoogleAccessToken()
        accessToken = authResult.accessToken
        storeGoogleToken(authResult.accessToken, authResult.expiresIn)
      }

      if (!window.google?.picker) {
        throw new Error('Google Picker API not available')
      }

      // Open Google Picker
      const pickerBuilder = new window.google.picker!.PickerBuilder()
      const picker = pickerBuilder
        .setOAuthToken(accessToken) as typeof pickerBuilder
      const pickerWithView = picker
        .addView(window.google.picker!.ViewId.SPREADSHEETS) as typeof pickerBuilder
      const pickerWithCallback = pickerWithView
        .setCallback(async (data: unknown) => {
          const pickerData = data as PickerResponse
          setIsPickerLoading(false)
          
          const action = pickerData[window.google!.picker!.Response.ACTION] as string
          if (action === window.google!.picker!.Action.PICKED && pickerData.DOCUMENTS && pickerData.DOCUMENTS.length > 0) {
            const doc = pickerData.DOCUMENTS[0]
            const sheetId = doc.id
            const sheetName = doc.name || `google-sheet-${sheetId.substring(0, 8)}`

            // Fetch sheet data using OAuth token
            try {
              setIsLoading(true)
              
              // Use OAuth token to fetch private sheet data
              const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z1000`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              })

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error?.message || 'Failed to fetch sheet data')
              }

              const sheetData = await response.json()
              
              if (!sheetData.values || sheetData.values.length === 0) {
                setError('Sheet appears to be empty.')
                setIsLoading(false)
                return
              }

              // Convert to ParsedCSV format
              const parsedCSV = convertSheetsToCSV(sheetData.values, sheetName)
              onDataLoaded(parsedCSV)
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to import selected sheet'
              setError(errorMessage)
              logError(err instanceof Error ? err : new Error(String(err)), {
                source: 'GoogleSheetsUrlTab/handlePickFromDrive',
              })
            } finally {
              setIsLoading(false)
            }
          } else {
            // User cancelled picker
            setIsPickerLoading(false)
          }
        }) as typeof pickerBuilder
      const builtPicker = pickerWithCallback.build()
      builtPicker.setVisible(true)
    } catch (err) {
      setIsPickerLoading(false)
      const errorMessage = err instanceof Error ? err.message : 'Failed to open Google Picker'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(String(err)), {
        source: 'GoogleSheetsUrlTab/handlePickFromDrive',
      })
    }
  }, [scriptsLoaded, onDataLoaded])

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
              // Clear the loaded CSV data so user can import a different sheet
              if (onClearData) {
                onClearData()
              }
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

  // Show URL input form - minimal, clean design with two options
  return (
    <div className="space-y-3">
      {/* Option 1: Pick from Google Drive */}
      <Button
        variant="brand"
        size="sm"
        onClick={handlePickFromDrive}
        disabled={!scriptsLoaded || isPickerLoading || isLoading || isUploading}
        className="w-full"
        aria-label="Pick Google Sheet from Drive"
      >
        {isPickerLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Opening picker...
          </>
        ) : (
          <>
            <FolderOpen className="h-3.5 w-3.5" />
            Pick from Google Drive
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Option 2: Paste URL */}
      <div className="relative">
        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
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
          placeholder="Paste Google Sheets URL..."
          className="pl-9 pr-3"
          disabled={isLoading || isUploading}
          aria-label="Google Sheets URL"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleImport}
        disabled={!url.trim() || isLoading || isUploading}
        className="w-full"
        aria-label="Import Google Sheet from URL"
      >
        {isLoading || isUploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Import from URL
          </>
        )}
      </Button>
    </div>
  )
}

