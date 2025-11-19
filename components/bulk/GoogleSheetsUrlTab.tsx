/**
 * Google Sheets URL Tab Component
 * Simple URL paste interface for importing public Google Sheets
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FileSpreadsheet, AlertCircle, CheckCircle, Link2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { extractSheetId, isValidGoogleSheetsUrl } from '@/lib/google-sheets-url-utils'
import { convertSheetsToCSV } from '@/lib/google-sheets-utils'
import { getGoogleAccessToken, getStoredGoogleToken, storeGoogleToken, isGoogleTokenValid } from '@/lib/auth/google-sheets'
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

export function GoogleSheetsUrlTab({
  csvData,
  fileName,
  isUploading,
  onDataLoaded,
  onClearData,
  selectedInputColumns,
  onInputColumnsChange
}: GoogleSheetsUrlTabProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // Note: scriptsLoaded state kept for potential future use, but currently only set, never read
  const [, setScriptsLoaded] = useState(false)
  const [allFiles, setAllFiles] = useState<Array<{ id: string; name: string; modifiedTime?: string }>>([])
  const [filteredFiles, setFilteredFiles] = useState<Array<{ id: string; name: string; modifiedTime?: string }>>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [sortBy, setSortBy] = useState<'modifiedTime' | 'name' | 'createdTime' | 'viewedByMeTime'>('modifiedTime')
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check Google auth state
  useEffect(() => {
    const checkAuthState = () => {
      const token = getStoredGoogleToken()
      const isValid = isGoogleTokenValid()
      setIsGoogleLoggedIn(!!token && isValid)
    }
    checkAuthState()
    // Check periodically
    const interval = setInterval(checkAuthState, 5000)
    return () => clearInterval(interval)
  }, [])

  // Load Google Picker API script
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if Client ID is available
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
                     process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID
    if (!clientId) {
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
          setError('Google Sheets integration failed to initialize. Please refresh the page.')
        }
      }
    }

    gsiScript.onload = () => {
      gsiLoaded = true
      checkLoaded()
    }
    
    gsiScript.onerror = () => {
      setError('Failed to load Google authentication. Please check your browser settings or try refreshing the page.')
    }

    pickerScript.onload = () => {
      pickerLoaded = true
      checkLoaded()
    }
    
    pickerScript.onerror = () => {
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

  // Handle Google Picker selection (unused - removed Google Picker button)
  // Removed _handlePickFromDrive function - no longer needed after replacing Picker with search dropdown

  // Handle importing from URL or file selection
  const handleImport = useCallback(async () => {
    const value = inputValue.trim()
    if (!value) {
      setError('Please enter a Google Sheets URL or select a file')
      return
    }

    setIsLoading(true)
    setError(null)
    setShowDropdown(false)

    let sheetId: string | null = null
    let sheetName: string | null = null

    // Check if it's a URL
    if (isValidGoogleSheetsUrl(value)) {
      sheetId = extractSheetId(value)
      if (!sheetId) {
        setError('Could not extract sheet ID from URL. Please check the URL format.')
        setIsLoading(false)
        return
      }
    } else {
      // It's a file name - find matching file
      const matchingFile = allFiles.find(f => f.name === value || f.id === value)
      if (matchingFile) {
        sheetId = matchingFile.id
        sheetName = matchingFile.name
      } else {
        setError('File not found. Please select from the dropdown or paste a valid URL.')
        setIsLoading(false)
        return
      }
    }

    try {
      // Step 1: Try CSV export URL first (works for public sheets, no API needed)
      const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`
      const csvResponse = await fetch(csvExportUrl)
      
      // If CSV export works, parse it directly
      if (csvResponse.ok) {
        const csvText = await csvResponse.text()
        
        if (!csvText || csvText.trim().length === 0) {
          setError('Sheet appears to be empty or no data found.')
          setIsLoading(false)
          return
        }

        // Parse CSV text to array of arrays
        const lines = csvText.split('\n').filter(line => line.trim())
        const values = lines.map(line => {
          // Simple CSV parsing (handles quoted fields)
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
          return result
        })

        // Use provided name or default
        let finalSheetName = sheetName || `google-sheet-${sheetId.substring(0, 8)}`
        if (!sheetName) {
          try {
            const accessToken = getStoredGoogleToken()
            if (accessToken && isGoogleTokenValid()) {
              const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}?fields=name`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              })
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json()
                if (metadata.name) {
                  finalSheetName = metadata.name
                }
              }
            }
          } catch {
            // Ignore metadata fetch errors
          }
        }

        // Convert to ParsedCSV format
        const parsedCSV = convertSheetsToCSV(values, finalSheetName)
        
        // Add Google Sheets metadata
        if (isValidGoogleSheetsUrl(value)) {
          parsedCSV.googleSheetsUrl = value
        }
        parsedCSV.googleSheetsId = sheetId
        
        // Clear input and errors
        setInputValue('')
        setError(null)
        
        // Notify parent
        onDataLoaded(parsedCSV)
        setIsLoading(false)
        return
      }

      // Step 2: CSV export failed (403 = private sheet)
      if (csvResponse.status === 403) {
        // Try OAuth flow for private sheets using Drive API (which we already have)
        const accessToken = getStoredGoogleToken()
        
        if (accessToken && isGoogleTokenValid()) {
          // Use Drive API to export as CSV (works with Drive API, no Sheets API needed)
          const driveExportUrl = `https://www.googleapis.com/drive/v3/files/${sheetId}/export?mimeType=text/csv`
          const driveResponse = await fetch(driveExportUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })
          
          // If OAuth token fails with 401, it's expired
          if (!driveResponse.ok && driveResponse.status === 401) {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('google_access_token')
              sessionStorage.removeItem('google_token_expires_at')
            }
            setIsGoogleLoggedIn(false)
            setError('Authentication expired. Please sign in again using the "Sign in to search" button.')
            setIsLoading(false)
            return
          }
          
          // If OAuth token fails with 403, user doesn't have access
          if (!driveResponse.ok && driveResponse.status === 403) {
            setError('Sheet is private. You don\'t have access. Ask the owner to share it with you or make it public.')
            setIsLoading(false)
            return
          }
          
          if (driveResponse.ok) {
            const csvText = await driveResponse.text()
            
            if (!csvText || csvText.trim().length === 0) {
              setError('Sheet appears to be empty or no data found.')
              setIsLoading(false)
              return
            }

            // Parse CSV text to array of arrays
            const lines = csvText.split('\n').filter(line => line.trim())
            const values = lines.map(line => {
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
              return result
            })

            // Use provided name or fetch metadata
            let finalSheetName = sheetName || `google-sheet-${sheetId.substring(0, 8)}`
            if (!sheetName) {
              try {
                const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}?fields=name`, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                })
                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json()
                  if (metadata.name) {
                    finalSheetName = metadata.name
                  }
                }
              } catch {
                // Ignore metadata fetch errors
              }
            }

            // Convert to ParsedCSV format
            const parsedCSV = convertSheetsToCSV(values, finalSheetName)
            
            // Add Google Sheets metadata
            if (isValidGoogleSheetsUrl(value)) {
              parsedCSV.googleSheetsUrl = value
            }
            parsedCSV.googleSheetsId = sheetId
            
            // Clear input and errors
            setInputValue('')
            setError(null)
            
            // Notify parent
            onDataLoaded(parsedCSV)
            setIsLoading(false)
            return
          }
        } else {
          // Not logged in - show error with options
          setError('Sheet is private. Sign in to Google to access it, or make the sheet public.')
          setIsLoading(false)
          return
        }
      }

      // Step 3: Other errors from CSV export
      setError('Failed to fetch Google Sheet. Please check the URL and ensure the sheet exists.')
      setIsLoading(false)
      return
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import Google Sheet'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, allFiles, onDataLoaded])

  // Filter files based on input (client-side filtering)
  const filterFiles = useCallback((files: Array<{ id: string; name: string; modifiedTime?: string }>, query: string) => {
    // If it looks like a URL, don't filter
    if (query.includes('docs.google.com') || query.includes('drive.google.com')) {
      setFilteredFiles([])
      return
    }
    
    if (!query.trim()) {
      setFilteredFiles(files)
      return
    }

    const lowerQuery = query.toLowerCase()
    const filtered = files.filter(file => 
      file.name.toLowerCase().includes(lowerQuery)
    )
    setFilteredFiles(filtered)
  }, [])

  // Update dropdown position when input changes or window scrolls/resizes
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [])

  // Load recent Google Sheets files
  const loadRecentFiles = useCallback(async () => {
    try {
      setIsLoadingFiles(true)
      let accessToken = getStoredGoogleToken()
      
      // If no valid token, request one
      if (!accessToken || !isGoogleTokenValid()) {
        try {
          const authResult = await getGoogleAccessToken()
          accessToken = authResult.accessToken
          storeGoogleToken(authResult.accessToken, authResult.expiresIn)
          setIsGoogleLoggedIn(true)
        } catch (authError) {
          setError('Please sign in to Google to search your files')
          setIsGoogleLoggedIn(false)
          return
        }
      }

      // Get recent Google Sheets files (sorted by various options)
      // API Reference: https://developers.google.com/drive/api/v3/reference/files/list
      // Valid orderBy options: modifiedTime, name, createdTime, viewedByMeTime, etc.
      const orderByMap: Record<string, string> = {
        modifiedTime: 'modifiedTime desc',
        name: 'name asc',
        createdTime: 'createdTime desc',
        viewedByMeTime: 'viewedByMeTime desc',
      }
      const orderBy = orderByMap[sortBy] || 'modifiedTime desc'
      const queryParams = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: 'files(id,name,modifiedTime,createdTime,viewedByMeTime)',
        orderBy: orderBy,
        pageSize: '50', // Limit to 50 files for performance
      })
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        // Check for specific error types
        if (response.status === 401) {
          setError('Authentication expired. Please sign in again.')
          setIsGoogleLoggedIn(false)
          // Clear invalid token
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('google_access_token')
            sessionStorage.removeItem('google_token_expires_at')
          }
        } else if (response.status === 403) {
          setError('Permission denied. Make sure you granted access to Google Drive.')
        } else {
          setError(`Failed to load files (${response.status}). Check Debug Logger for details.`)
        }
        throw new Error(`Failed to load Google Drive files: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.files || data.files.length === 0) {
        
        // If we got 0 files but API call succeeded, might be scope issue
        if (data.files && Array.isArray(data.files) && data.files.length === 0) {
          setError('No Google Sheets found. If you have sheets, try clicking "Refresh" next to "Signed in" to re-authenticate with full access.')
        }
        
        setAllFiles([])
        setFilteredFiles([])
        setIsLoadingFiles(false)
        return
      }
      
      const files = data.files.map((file: { id: string; name: string; modifiedTime?: string }) => ({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
      }))
      
      setAllFiles(files)
      setIsGoogleLoggedIn(true)
      // Filter files based on current input value
      filterFiles(files, inputValue)
    } catch (err) {
      setAllFiles([])
      setFilteredFiles([])
    } finally {
      setIsLoadingFiles(false)
    }
  }, [sortBy, filterFiles, inputValue])

  // Handle input change - filter client-side or detect URL
  useEffect(() => {
    const value = inputValue.trim()
    
    // If it's a URL, don't show dropdown
    if (value.includes('docs.google.com') || value.includes('drive.google.com')) {
      setShowDropdown(false)
      return
    }
    
    // If it's empty or just whitespace, show all files
    if (!value) {
      filterFiles(allFiles, '')
      if (showDropdown && allFiles.length > 0) {
        setShowDropdown(true)
      }
      return
    }
    
    // Filter files as user types
    filterFiles(allFiles, value)
    if (allFiles.length > 0) {
      setShowDropdown(true)
    }
  }, [inputValue, allFiles, filterFiles, showDropdown])

  // Load files when dropdown opens
  useEffect(() => {
    if (showDropdown && allFiles.length === 0 && !isLoadingFiles) {
      loadRecentFiles()
    }
  }, [showDropdown, allFiles.length, isLoadingFiles, loadRecentFiles])

  // Reload files when sort changes
  useEffect(() => {
    if (showDropdown && allFiles.length > 0) {
      loadRecentFiles()
    }
  }, [sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update position on scroll/resize
  useEffect(() => {
    if (!showDropdown) return

    const handleUpdate = () => {
      updateDropdownPosition()
    }

    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    updateDropdownPosition()

    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [showDropdown, updateDropdownPosition])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [showDropdown])

  // Handle selecting a file from dropdown
  const handleSelectFile = useCallback(async (fileId: string, fileName: string) => {
    setShowDropdown(false)
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      let accessToken = getStoredGoogleToken()
      if (!accessToken || !isGoogleTokenValid()) {
        const authResult = await getGoogleAccessToken()
        accessToken = authResult.accessToken
        storeGoogleToken(authResult.accessToken, authResult.expiresIn)
        setIsGoogleLoggedIn(true)
      }

      // Fetch sheet data
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/A1:Z1000`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          // Token expired - clear it and ask user to sign in again
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('google_access_token')
            sessionStorage.removeItem('google_token_expires_at')
          }
          setIsGoogleLoggedIn(false)
          setError('Authentication expired. Please sign in again using the "Sign in to search" button.')
          setIsLoading(false)
          return
        } else if (response.status === 403) {
          setError('You don\'t have access to this sheet. Ask the owner to share it with you.')
          setIsLoading(false)
          return
        } else if (response.status === 404) {
          setError('Sheet not found. It may have been deleted or the ID is incorrect.')
          setIsLoading(false)
          return
        }
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || 'Failed to fetch sheet data'
        throw new Error(errorMessage)
      }

      const sheetData = await response.json()
      
      if (!sheetData.values || sheetData.values.length === 0) {
        setError('Sheet appears to be empty.')
        setIsLoading(false)
        return
      }

      const parsedCSV = convertSheetsToCSV(sheetData.values, fileName)
      parsedCSV.googleSheetsId = fileId
      onDataLoaded(parsedCSV)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import selected sheet'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [onDataLoaded])

  // Show CSV Preview if data is loaded (same as CSV tab) - MUST be after all hooks
  if (csvData && !isUploading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInputValue('')
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
                    className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-muted/10' : 'bg-transparent'}`}
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

  // Unified input field - handles both URL paste and file search
  return (
    <div className="space-y-3">
      {/* URL Input */}
      <div className="space-y-2">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setError(null)
          }}
          onFocus={() => {
            // Only show dropdown if user is already signed in
            if (isGoogleLoggedIn && !inputValue.includes('docs.google.com') && !inputValue.includes('drive.google.com')) {
              updateDropdownPosition()
              setShowDropdown(true)
              if (allFiles.length === 0 && !isLoadingFiles) {
                loadRecentFiles()
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading && inputValue.trim()) {
              handleImport()
            } else if (e.key === 'Escape') {
              setShowDropdown(false)
            }
          }}
          placeholder="Paste Google Sheets URL..."
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'google-sheets-error' : undefined}
          disabled={isLoading || isUploading}
          className="w-full"
          aria-label="Google Sheets URL"
        />
        
        {/* Auth status and sign in button - separate row */}
        <div className="flex items-center justify-between">
          {isGoogleLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-600 dark:text-green-400">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                Signed in
              </div>
              {allFiles.length <= 1 && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('google_access_token')
                      sessionStorage.removeItem('google_token_expires_at')
                    }
                    setIsGoogleLoggedIn(false)
                    setAllFiles([])
                    setFilteredFiles([])
                    setTimeout(async () => {
                      try {
                        const authResult = await getGoogleAccessToken()
                        storeGoogleToken(authResult.accessToken, authResult.expiresIn)
                        setIsGoogleLoggedIn(true)
                        loadRecentFiles()
                      } catch (err) {
                        setError('Failed to re-authenticate. Please try again.')
                      }
                    }, 0)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  title="Re-authenticate to see all files"
                >
                  Refresh
                </button>
              )}
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsLoading(true)
                setError(null)
                try {
                  const authResult = await getGoogleAccessToken()
                  storeGoogleToken(authResult.accessToken, authResult.expiresIn)
                  setIsGoogleLoggedIn(true)
                  await loadRecentFiles()
                } catch (err) {
                  setError('Failed to sign in. Please try again.')
                } finally {
                  setIsLoading(false)
                }
              }}
              disabled={isLoading}
              className="h-7 px-2 text-xs"
            >
              {isLoading ? (
                <>
                  <div className="h-3 w-3 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Search className="h-3 w-3 mr-1.5" />
                  Sign in to search files
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Dropdown with files (only show when signed in and not a URL) - rendered via Portal to avoid clipping */}
      {showDropdown && isGoogleLoggedIn && !inputValue.includes('docs.google.com') && !inputValue.includes('drive.google.com') && dropdownPosition && typeof window !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {/* Sort options */}
            <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/30">
              <span className="text-xs text-muted-foreground">Sort by:</span>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setSortBy('modifiedTime')}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    sortBy === 'modifiedTime'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent text-muted-foreground'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    sortBy === 'name'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent text-muted-foreground'
                  }`}
                >
                  Name
                </button>
                <button
                  onClick={() => setSortBy('createdTime')}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    sortBy === 'createdTime'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent text-muted-foreground'
                  }`}
                >
                  Created
                </button>
                <button
                  onClick={() => setSortBy('viewedByMeTime')}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    sortBy === 'viewedByMeTime'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent text-muted-foreground'
                  }`}
                >
                  Viewed
                </button>
              </div>
            </div>

            {/* Files list */}
            <div className="overflow-y-auto max-h-[240px]">
              {isLoadingFiles ? (
                <div className="px-3 py-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Loading files...
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                  {inputValue.trim() ? 'No sheets found matching your search' : 'No sheets found'}
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleSelectFile(file.id, file.name)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground flex items-center gap-2 border-b border-border last:border-0 transition-colors"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate flex-1">{file.name}</span>
                    {file.modifiedTime && sortBy === 'modifiedTime' && (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(file.modifiedTime).toLocaleDateString()}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Error message */}
      {error && (
        <div id="google-sheets-error" role="alert" aria-live="polite" className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <span>{error}</span>
            {(error.includes('private') || error.includes('PERMISSION_DENIED') || error.includes('permission')) && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  This sheet is private. Choose an option:
                </p>
                <div className="flex gap-2 flex-wrap">
                  {!isGoogleLoggedIn && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={async () => {
                        try {
                          setIsLoading(true)
                          setError(null)
                          const authResult = await getGoogleAccessToken()
                          storeGoogleToken(authResult.accessToken, authResult.expiresIn)
                          setIsGoogleLoggedIn(true)
                          // Retry import after sign in
                          await handleImport()
                        } catch (err) {
                          setError('Failed to sign in. Please try again.')
                          setIsLoading(false)
                        }
                      }}
                      disabled={isLoading}
                      className="h-7 text-[10px] px-3"
                    >
                      {isLoading ? (
                        <>
                          <div className="h-3 w-3 mr-1 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <Search className="h-3 w-3 mr-1" />
                          Sign in to access
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Open Google Sheets sharing settings
                      const sheetId = extractSheetId(inputValue) || allFiles.find(f => f.name === inputValue)?.id
                      if (sheetId) {
                        window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`, '_blank')
                      } else {
                        // Fallback: show instructions
                        setError('To make the sheet public: 1) Open the sheet in Google Sheets, 2) Click "Share" → "Change to anyone with the link" → "Viewer", 3) Try importing again.')
                      }
                    }}
                    className="h-7 text-[10px] px-3"
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    Make public
                  </Button>
                </div>
                {isGoogleLoggedIn && (
                  <p className="text-xs text-muted-foreground">
                    You&apos;re signed in but don&apos;t have access. The sheet owner needs to share it with you or make it public.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import button */}
      <Button
        variant="default"
        size="sm"
        onClick={handleImport}
        disabled={!inputValue.trim() || isLoading || isUploading}
        className="w-full"
        aria-label="Import Google Sheet"
      >
        {isLoading || isUploading ? (
          <>
            <div className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
            Import Sheet
          </>
        )}
      </Button>
    </div>
  )
}

