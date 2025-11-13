/**
 * Hook for Google Sheets integration
 * Handles OAuth authentication and Google Sheets data fetching
 */

import { useState, useCallback } from 'react'
import { logError } from '@/lib/errors'

declare global {
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void
      auth2: {
        init: (config: { client_id: string }) => Promise<void>
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean
            listen: (callback: (signedIn: boolean) => void) => void
          }
          currentUser: {
            get: () => {
              getAuthResponse: () => {
                access_token: string
              }
            }
          }
          signIn: () => Promise<void>
          signOut: () => Promise<void>
        }
      }
      client: {
        init: (config: { apiKey: string; clientId: string; discoveryDocs: string[]; scope: string }) => Promise<void>
        sheets: {
          spreadsheets: {
            get: (params: { spreadsheetId: string }) => Promise<{ result: any }>
            values: {
              get: (params: { spreadsheetId: string; range: string }) => Promise<{ result: any }>
            }
          }
        }
      }
    }
    google?: {
      picker: {
        PickerBuilder: new () => {
          setOAuthToken: (token: string) => any
          addView: (view: any) => any
          setCallback: (callback: (data: any) => void) => any
          build: () => { setVisible: (visible: boolean) => void }
        }
        ViewId: {
          SPREADSHEETS: string
        }
        Response: {
          ACTION: string
          DOCUMENTS: string
        }
        Action: {
          PICKED: string
        }
      }
    }
  }
}

interface GoogleSheet {
  id: string
  name: string
  url: string
}

interface UseGoogleSheetsReturn {
  isAuthenticated: boolean
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  selectedSheet: GoogleSheet | null
  
  initialize: () => Promise<void>
  authenticate: () => Promise<void>
  signOut: () => Promise<void>
  pickSheet: () => Promise<GoogleSheet | null>
  fetchSheetData: (sheetId: string, range?: string) => Promise<string[][]>
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''

export function useGoogleSheets(): UseGoogleSheetsReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<GoogleSheet | null>(null)

  // Note: Script loading is now handled by GoogleSheetsTab component
  // This hook assumes scripts are already loaded

  // Initialize Google API (assumes scripts are already loaded)
  const initialize = useCallback(async () => {
    if (typeof window === 'undefined') {
      setError('Not in browser environment')
      return
    }

    if (!window.gapi) {
      setError('Google API scripts not loaded. Please wait for scripts to load.')
      return
    }

    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID not configured')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Initialize auth2
      await window.gapi.auth2.init({
        client_id: GOOGLE_CLIENT_ID,
      })

      // Check auth status
      const authInstance = window.gapi.auth2.getAuthInstance()
      setIsAuthenticated(authInstance.isSignedIn.get())

      // Listen for auth changes
      authInstance.isSignedIn.listen((signedIn) => {
        setIsAuthenticated(signedIn)
      })

      // Initialize client for Sheets API
      await window.gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        clientId: GOOGLE_CLIENT_ID,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
      })

      setIsInitialized(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Google API'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'googleSheetsInitialize',
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Authenticate user
  const authenticate = useCallback(async () => {
    if (!window.gapi || !isInitialized) {
      await initialize()
    }

    setIsLoading(true)
    setError(null)

    try {
      if (!window.gapi) {
        throw new Error('Google API not loaded')
      }
      const authInstance = window.gapi.auth2.getAuthInstance()
      await authInstance.signIn()
      setIsAuthenticated(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'googleSheetsAuthenticate',
      })
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized, initialize])

  // Sign out
  const signOut = useCallback(async () => {
    if (!window.gapi) return

    try {
      const authInstance = window.gapi.auth2.getAuthInstance()
      await authInstance.signOut()
      setIsAuthenticated(false)
      setSelectedSheet(null)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'googleSheetsSignOut',
      })
    }
  }, [])

  // Pick a Google Sheet using Picker API
  const pickSheet = useCallback(async (): Promise<GoogleSheet | null> => {
    if (!window.gapi) {
      setError('Google API not loaded')
      return null
    }

    if (!isAuthenticated) {
      await authenticate()
      if (!isAuthenticated) {
        setError('Please authenticate first')
        return null
      }
    }

    setIsLoading(true)
    setError(null)

    return new Promise((resolve) => {
      try {
        if (!window.google?.picker) {
          throw new Error('Google Picker API not loaded')
        }

        if (!window.gapi?.auth2) {
          throw new Error('Google Auth2 not initialized')
        }

        const authInstance = window.gapi.auth2.getAuthInstance()
        if (!authInstance) {
          throw new Error('Auth instance not available')
        }

        const user = authInstance.currentUser.get()
        if (!user) {
          throw new Error('User not authenticated')
        }

        const authResponse = user.getAuthResponse()
        if (!authResponse?.access_token) {
          throw new Error('Access token not available')
        }

        const oauthToken = authResponse.access_token

        const picker = new window.google.picker.PickerBuilder()
          .setOAuthToken(oauthToken)
          .addView(window.google.picker.ViewId.SPREADSHEETS)
          .setCallback((data: any) => {
            if (data[window.google!.picker.Response.ACTION] === window.google!.picker.Action.PICKED) {
              const doc = data[window.google!.picker.Response.DOCUMENTS][0]
              const sheet: GoogleSheet = {
                id: doc.id,
                name: doc.name,
                url: doc.url,
              }
              setSelectedSheet(sheet)
              resolve(sheet)
            } else {
              resolve(null)
            }
            setIsLoading(false)
          })
          .build()

        picker.setVisible(true)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to open sheet picker'
        setError(errorMessage)
        setIsLoading(false)
        resolve(null)
      }
    })
  }, [isAuthenticated, authenticate])

  // Fetch sheet data
  const fetchSheetData = useCallback(async (sheetId: string, range = 'A1:Z1000'): Promise<string[][]> => {
    if (!window.gapi) {
      throw new Error('Google API not loaded')
    }

    if (!isAuthenticated) {
      throw new Error('Not authenticated')
    }

    if (!window.gapi.client?.sheets) {
      throw new Error('Google Sheets API not initialized')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      })

      if (!response?.result) {
        throw new Error('Invalid response from Google Sheets API')
      }

      const values = response.result.values || []
      setIsLoading(false)
      return values
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sheet data'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'googleSheetsFetchData',
        sheetId,
      })
      setIsLoading(false)
      throw err
    }
  }, [isAuthenticated])

  return {
    isAuthenticated,
    isInitialized,
    isLoading,
    error,
    selectedSheet,
    initialize,
    authenticate,
    signOut,
    pickSheet,
    fetchSheetData,
  }
}

