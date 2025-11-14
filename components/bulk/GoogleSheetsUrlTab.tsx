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
import type { LogEntry } from '@/components/debug/DebugLogger'

// Helper to log to DebugLogger
const debugLog = (level: LogEntry['level'], message: string, data?: unknown) => {
  const logEntry: LogEntry = {
    id: `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    level,
    message: `[Google Picker] ${message}`,
    data,
  }
  window.dispatchEvent(new CustomEvent('debug-log', { detail: logEntry }))
  // Also log to console for immediate visibility
  const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
  console[consoleMethod](`[Google Picker] ${message}`, data || '')
}

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

    // Check if scripts are already in DOM (avoid duplicates)
    const existingGsiScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    const existingPickerScript = document.querySelector('script[src="https://apis.google.com/js/picker.js"]')
    debugLog('info', '📜 Checking for existing scripts', {
      hasGsiScript: !!existingGsiScript,
      hasPickerScript: !!existingPickerScript,
    })

    // If scripts exist, wait for them to load
    if (existingGsiScript && existingPickerScript) {
      let checkAttempts = 0
      const maxAttempts = 50 // 5 seconds max wait
      const checkExisting = () => {
        checkAttempts++
        if (window.google?.picker && window.google?.accounts?.oauth2) {
          setScriptsLoaded(true)
        } else if (checkAttempts < maxAttempts) {
          setTimeout(checkExisting, 100)
        } else {
          console.error('[Google Sheets] Existing scripts found but APIs not initialized')
        }
      }
      checkExisting()
      return
    }

    // Load Google Identity Services (for OAuth)
    const gsiScript = document.createElement('script')
    gsiScript.src = 'https://accounts.google.com/gsi/client'
    gsiScript.async = true
    gsiScript.defer = true
    gsiScript.id = 'google-gsi-script'

    // Load Google Picker API
    const pickerScript = document.createElement('script')
    pickerScript.src = 'https://apis.google.com/js/picker.js'
    pickerScript.async = true
    pickerScript.defer = true
    pickerScript.id = 'google-picker-script'

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
          console.error('[Google Sheets] Scripts loaded but APIs not initialized', {
            hasPicker: !!window.google?.picker,
            hasOAuth2: !!window.google?.accounts?.oauth2,
          })
          setError('Google Sheets integration failed to initialize. Please refresh the page.')
        }
      }
    }

    gsiScript.onload = () => {
      gsiLoaded = true
      checkLoaded()
    }
    
    gsiScript.onerror = (err) => {
      console.error('[Google Sheets] Failed to load Google Identity Services', err)
      setError('Failed to load Google authentication. Please check your browser settings or try refreshing the page.')
    }

    pickerScript.onload = () => {
      pickerLoaded = true
      checkLoaded()
    }
    
    pickerScript.onerror = (err) => {
      console.error('[Google Sheets] Failed to load Google Picker API', err)
      setError('Failed to load Google Picker. This may be blocked by your browser or security settings. Please try refreshing the page.')
    }

    // Only append if not already in DOM
    if (!existingGsiScript) {
      document.head.appendChild(gsiScript)
    } else {
      gsiLoaded = true
    }

    if (!existingPickerScript) {
      document.head.appendChild(pickerScript)
    } else {
      pickerLoaded = true
    }

    // If both scripts already existed, check immediately
    if (existingGsiScript && existingPickerScript) {
      checkLoaded()
    }

    return () => {
      // Don't remove scripts on unmount as they may be needed by other components
    }
  }, [])

  // Handle Google Picker selection
  const handlePickFromDrive = useCallback(async () => {
    debugLog('info', '🚀 Starting Google Picker flow', { scriptsLoaded, timestamp: new Date().toISOString() })
    
    if (!scriptsLoaded) {
      debugLog('error', '❌ Scripts not loaded yet', { scriptsLoaded })
      setError('Google Picker API not loaded yet. Please wait a moment and try again.')
      return
    }

    setIsPickerLoading(true)
    setError(null)
    debugLog('info', '⏳ Loading state set to true')

    try {
      // Get or request Google access token
      debugLog('info', '🔑 Step 1: Getting access token...')
      let accessToken = getStoredGoogleToken()
      const hasStoredToken = !!accessToken && isGoogleTokenValid()
      debugLog('info', '📋 Token check', { 
        hasStoredToken: !!accessToken, 
        isValid: hasStoredToken,
        tokenLength: accessToken?.length || 0
      })
      
      if (!accessToken || !isGoogleTokenValid()) {
        debugLog('info', '🔄 Requesting new OAuth token...')
        try {
          const authResult = await getGoogleAccessToken()
          accessToken = authResult.accessToken
          storeGoogleToken(authResult.accessToken, authResult.expiresIn)
          debugLog('success', '✅ Token obtained successfully', { 
            tokenLength: accessToken.length,
            expiresIn: authResult.expiresIn 
          })
        } catch (tokenError) {
          debugLog('error', '❌ Failed to get OAuth token', { 
            error: tokenError instanceof Error ? tokenError.message : String(tokenError),
            stack: tokenError instanceof Error ? tokenError.stack : undefined
          })
          throw tokenError
        }
      } else {
        debugLog('success', '✅ Using stored token', { tokenLength: accessToken.length })
      }

      debugLog('info', '🔍 Step 2: Checking Google Picker API availability...')
      const apiStatus = {
        hasGoogle: !!window.google,
        hasPicker: !!window.google?.picker,
        hasAccounts: !!window.google?.accounts,
        hasOAuth2: !!window.google?.accounts?.oauth2,
        pickerBuilder: typeof window.google?.picker?.PickerBuilder,
        viewId: !!window.google?.picker?.ViewId,
        response: !!window.google?.picker?.Response,
        action: !!window.google?.picker?.Action,
      }
      debugLog('info', '📊 API Status', apiStatus)
      
      if (!window.google?.picker) {
        const errorMsg = 'Google Picker API not available'
        debugLog('error', '❌ API not available', apiStatus)
        setError(errorMsg + '. Check Debug Logger (bottom right) for details.')
        setIsPickerLoading(false)
        return
      }

      debugLog('info', '🔧 Step 3: Building picker instance...')
      // Add timeout to reset loading state if picker doesn't open
      let loadingTimeout: NodeJS.Timeout | null = null
      const timeoutDuration = 20000 // 20 seconds for production
      const timeoutStartTime = Date.now()
      
      loadingTimeout = setTimeout(() => {
        const elapsed = ((Date.now() - timeoutStartTime) / 1000).toFixed(1)
        debugLog('error', `⏱️ TIMEOUT after ${elapsed}s - Picker did not open`, {
          elapsedSeconds: elapsed,
          scriptsLoaded,
          hasGoogle: !!window.google,
          hasPicker: !!window.google?.picker,
          hasToken: !!accessToken,
          tokenLength: accessToken?.length,
          currentUrl: window.location.href,
          userAgent: navigator.userAgent,
          popupBlocked: false, // Can't detect, but worth noting
        })
        setIsPickerLoading(false)
        setError(`Google Picker failed to open after ${elapsed}s. Check Debug Logger (bottom right) for details.`)
      }, timeoutDuration)
      debugLog('info', `⏱️ Timeout set for ${timeoutDuration / 1000}s`)

      // Open Google Picker
      debugLog('info', '🏗️ Creating PickerBuilder...')
      let pickerBuilder
      try {
        pickerBuilder = new window.google.picker!.PickerBuilder()
        debugLog('success', '✅ PickerBuilder created')
      } catch (builderError) {
        debugLog('error', '❌ Failed to create PickerBuilder', { 
          error: builderError instanceof Error ? builderError.message : String(builderError)
        })
        if (loadingTimeout) clearTimeout(loadingTimeout)
        setIsPickerLoading(false)
        throw builderError
      }

      debugLog('info', '🔑 Setting OAuth token...')
      let picker
      try {
        picker = pickerBuilder.setOAuthToken(accessToken) as typeof pickerBuilder
        debugLog('success', '✅ OAuth token set', { tokenLength: accessToken.length })
      } catch (tokenError) {
        debugLog('error', '❌ Failed to set OAuth token', { 
          error: tokenError instanceof Error ? tokenError.message : String(tokenError)
        })
        if (loadingTimeout) clearTimeout(loadingTimeout)
        setIsPickerLoading(false)
        throw tokenError
      }

      debugLog('info', '📋 Adding SPREADSHEETS view...')
      let pickerWithView
      try {
        pickerWithView = picker.addView(window.google.picker!.ViewId.SPREADSHEETS) as typeof pickerBuilder
        debugLog('success', '✅ SPREADSHEETS view added')
      } catch (viewError) {
        debugLog('error', '❌ Failed to add view', { 
          error: viewError instanceof Error ? viewError.message : String(viewError)
        })
        if (loadingTimeout) clearTimeout(loadingTimeout)
        setIsPickerLoading(false)
        throw viewError
      }

      debugLog('info', '📞 Setting callback...')
      const pickerWithCallback = pickerWithView.setCallback(async (data: unknown) => {
        const callbackTime = Date.now()
        debugLog('success', '🎉 CALLBACK TRIGGERED!', {
          timestamp: new Date().toISOString(),
          elapsedMs: callbackTime - timeoutStartTime,
          dataType: typeof data,
          dataKeys: data ? Object.keys(data as object) : null,
          fullData: data,
        })
        
        // Clear timeout since picker opened and callback was triggered
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
          loadingTimeout = null
          debugLog('info', '✅ Timeout cleared - picker opened successfully')
        }
        
        const pickerData = data as PickerResponse
        setIsPickerLoading(false)
        
        const action = pickerData[window.google!.picker!.Response.ACTION] as string
        debugLog('info', '📥 Processing callback action', { 
          action,
          expectedAction: window.google!.picker!.Action.PICKED,
          isPicked: action === window.google!.picker!.Action.PICKED,
          hasDocuments: !!pickerData.DOCUMENTS,
          documentCount: pickerData.DOCUMENTS?.length || 0,
        })
          if (action === window.google!.picker!.Action.PICKED && pickerData.DOCUMENTS && pickerData.DOCUMENTS.length > 0) {
            const doc = pickerData.DOCUMENTS[0]
            const sheetId = doc.id
            const sheetName = doc.name || `google-sheet-${sheetId.substring(0, 8)}`
            debugLog('success', '📄 Sheet selected', { sheetId, sheetName })

            // Fetch sheet data using OAuth token
            try {
              setIsLoading(true)
              debugLog('info', '📥 Fetching sheet data from Google Sheets API...')
              
              // Use OAuth token to fetch private sheet data
              const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z1000`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              })
              debugLog('info', '📡 API Response received', { 
                status: response.status, 
                statusText: response.statusText,
                ok: response.ok 
              })

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.error?.message || 'Failed to fetch sheet data'
                const errorReason = errorData.error?.errors?.[0]?.reason || errorData.error?.status || ''
                
                // Check if the error is specifically about API not being enabled
                const isApiNotEnabled = 
                  errorMessage.toLowerCase().includes('has not been used') ||
                  errorMessage.toLowerCase().includes('is disabled') ||
                  errorMessage.toLowerCase().includes('enable it by visiting') ||
                  errorReason === 'SERVICE_DISABLED' ||
                  errorReason === 'API_NOT_ENABLED'
                
                if (response.status === 403 && isApiNotEnabled) {
                  // Extract project ID from error message if available
                  const projectIdMatch = errorMessage.match(/project (\d+)/i)
                  const projectId = projectIdMatch ? projectIdMatch[1] : 'your project'
                  const enableUrl = `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=${projectId}`
                  throw new Error(`Google Sheets API is not enabled for project ${projectId}. Enable it here: ${enableUrl}`)
                }
                
                throw new Error(errorMessage)
              }

              const sheetData = await response.json()
              
              if (!sheetData.values || sheetData.values.length === 0) {
                setError('Sheet appears to be empty.')
                setIsLoading(false)
                return
              }

              // Convert to ParsedCSV format
              const parsedCSV = convertSheetsToCSV(sheetData.values, sheetName)
              // Add Google Sheets metadata
              parsedCSV.googleSheetsId = sheetId
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
            // User cancelled picker or other action (CANCEL, etc.)
            // Note: Action.CANCEL might not be available in all Picker API versions
            setIsPickerLoading(false)
            if (action !== window.google!.picker!.Action.PICKED) {
              console.log('[Google Picker] Action:', action, pickerData)
            }
          }
        }) as typeof pickerBuilder
      
      console.log('   Building picker instance...')
      const builtPicker = pickerWithCallback.build()
      console.log('   Picker built successfully:', !!builtPicker)
      console.log('   Built picker methods:', Object.keys(builtPicker))
      
      try {
        console.log('5. Calling setVisible(true)...')
        console.log('   Access token present:', !!accessToken)
        console.log('   Access token length:', accessToken?.length)
        console.log('   Built picker exists:', !!builtPicker)
        console.log('   setVisible method exists:', typeof builtPicker.setVisible === 'function')
        
        builtPicker.setVisible(true)
        console.log('   ✓ setVisible(true) called successfully')
        console.log('   Waiting for picker to open (callback will fire when user interacts)...')
        // Note: Timeout will be cleared by the callback when picker opens
        // If picker doesn't open within 10 seconds, timeout will reset loading state
      } catch (pickerError) {
        console.error('[Google Picker] Exception thrown by setVisible:', pickerError)
        console.error('   Error type:', pickerError instanceof Error ? pickerError.constructor.name : typeof pickerError)
        console.error('   Error message:', pickerError instanceof Error ? pickerError.message : String(pickerError))
        console.error('   Error stack:', pickerError instanceof Error ? pickerError.stack : 'No stack')
        
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
        }
        setIsPickerLoading(false)
        const errorMsg = pickerError instanceof Error ? pickerError.message : 'Unknown error'
        setError(`Failed to open Google Picker: ${errorMsg}. Check browser console (F12) for details. Ensure Google Picker API is enabled in Google Cloud Console.`)
        console.groupEnd()
        throw new Error(`Failed to open Google Picker: ${errorMsg}`)
      }
      
      console.groupEnd()
    } catch (err) {
      console.error('[Google Picker] Top-level error:', err)
      console.error('   Error type:', err instanceof Error ? err.constructor.name : typeof err)
      console.error('   Error message:', err instanceof Error ? err.message : String(err))
      console.error('   Error stack:', err instanceof Error ? err.stack : 'No stack')
      console.groupEnd()
      
      setIsPickerLoading(false)
      const errorMessage = err instanceof Error ? err.message : 'Failed to open Google Picker'
      setError(`${errorMessage}. Open browser console (F12) for detailed debugging information.`)
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
        const activationUrl = errorData.activationUrl
        const projectId = errorData.projectId
        
        // Check if API not enabled error (503 status)
        if (response.status === 503 && activationUrl) {
          setError(`Google Sheets API is not enabled for project ${projectId || 'your project'}. Enable it here: ${activationUrl}`)
        }
        // Handle permission/access errors (private sheet)
        else if (
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
      // Add Google Sheets metadata
      parsedCSV.googleSheetsUrl = url
      parsedCSV.googleSheetsId = sheetId
      
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

