/**
 * ABOUTME: Google OAuth utility for Google Sheets export
 * ABOUTME: Uses Google OAuth popup flow to get access token for Sheets API
 */

'use client'

import { logError } from '@/lib/errors'
import type { LogEntry } from '@/components/debug/DebugLogger'

// Helper to log to DebugLogger
const debugLog = (level: LogEntry['level'], message: string, data?: unknown) => {
  const logEntry: LogEntry = {
    id: `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    level,
    message: `[Google OAuth] ${message}`,
    data,
  }
  window.dispatchEvent(new CustomEvent('debug-log', { detail: logEntry }))
  // Also log to console
  const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
  console[consoleMethod](`[Google OAuth] ${message}`, data || '')
}

// Support both naming conventions for flexibility
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
                         process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || 
                         ''

// Scopes needed for creating and writing to Google Sheets
// Note: spreadsheets scope requires verification, so we use drive.file for now
// drive.file allows creating files and accessing files created by the app
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

interface GoogleAuthResult {
  accessToken: string
  expiresIn: number
}

/**
 * Get Google OAuth access token via popup flow
 * Returns access token that can be used for Google Sheets API
 * Uses Google Identity Services (newer OAuth 2.0 API)
 */
export async function getGoogleAccessToken(): Promise<GoogleAuthResult> {
  debugLog('info', '🚀 Starting OAuth token request', { 
    hasClientId: !!GOOGLE_CLIENT_ID,
    clientIdLength: GOOGLE_CLIENT_ID.length,
    scopes: SCOPES,
  })

  if (!GOOGLE_CLIENT_ID) {
    const error = 'Google Client ID not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable.'
    debugLog('error', '❌ ' + error)
    throw new Error(error)
  }

  if (typeof window === 'undefined') {
    const error = 'Not in browser environment'
    debugLog('error', '❌ ' + error)
    throw new Error(error)
  }

  // Load Google Identity Services script if not already loaded
  const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolveScript, rejectScript) => {
      if (window.google?.accounts?.oauth2) {
        debugLog('success', '✅ Google Identity Services already loaded')
        resolveScript()
        return
      }

      debugLog('info', '📜 Loading Google Identity Services script...')
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        debugLog('info', '📜 Script loaded, waiting for initialization...')
        // Wait a bit for the script to initialize
        setTimeout(() => {
          if (window.google?.accounts?.oauth2) {
            debugLog('success', '✅ Google Identity Services initialized')
            resolveScript()
          } else {
            const error = 'Google Identity Services not initialized'
            debugLog('error', '❌ ' + error)
            rejectScript(new Error(error))
          }
        }, 100)
      }
      script.onerror = () => {
        const error = 'Failed to load Google Identity Services'
        debugLog('error', '❌ ' + error)
        rejectScript(new Error(error))
      }
      document.head.appendChild(script)
    })
  }

  try {
    await loadGoogleScript()
  } catch (scriptError) {
    debugLog('error', '❌ Failed to load script', { error: scriptError })
    throw scriptError
  }

  if (!window.google?.accounts?.oauth2) {
    const error = 'Google Identity Services not available'
    debugLog('error', '❌ ' + error)
    throw new Error(error)
  }

  debugLog('info', '🔧 Initializing token client...', { clientId: GOOGLE_CLIENT_ID.substring(0, 20) + '...' })

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    let callbackFired = false

    // Add timeout to detect if popup never opens or callback never fires
    const timeout = setTimeout(() => {
      if (!callbackFired) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        debugLog('error', `⏱️ TIMEOUT after ${elapsed}s - OAuth callback never fired`, {
          elapsedSeconds: elapsed,
          callbackFired,
        })
        reject(new Error(`OAuth timeout after ${elapsed}s. The popup may have been blocked or the user didn't complete authorization.`))
      }
    }, 60000) // 60 second timeout

    try {
      // Use Google Identity Services token client
      debugLog('info', '🏗️ Creating token client...')
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response: { access_token?: string; error?: string; error_description?: string; expires_in?: number }) => {
          callbackFired = true
          clearTimeout(timeout)
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
          
          debugLog('success', `🎉 OAuth callback fired after ${elapsed}s`, {
            hasError: !!response.error,
            hasAccessToken: !!response.access_token,
            error: response.error,
            errorDescription: response.error_description,
            tokenLength: response.access_token?.length,
            expiresIn: response.expires_in,
          })

          if (response.error) {
            // Provide more helpful error messages
            let errorMessage = response.error
            if (response.error === 'redirect_uri_mismatch') {
              errorMessage = 'OAuth configuration error: redirect_uri_mismatch. Please check Google Cloud Console OAuth consent screen and ensure the app is published. See GOOGLE_OAUTH_SETUP.md for details.'
            } else if (response.error === 'access_denied') {
              errorMessage = 'Access denied. The app may not be published or may not comply with Google\'s OAuth 2.0 policy. Please check the OAuth consent screen configuration.'
            } else if (response.error_description) {
              errorMessage = `${response.error}: ${response.error_description}`
            }
            debugLog('error', '❌ OAuth error in callback', { error: errorMessage })
            reject(new Error(errorMessage))
            return
          }
          
          if (response.access_token) {
            debugLog('success', '✅ Access token received successfully', { 
              tokenLength: response.access_token.length,
              expiresIn: response.expires_in 
            })
            resolve({
              accessToken: response.access_token,
              expiresIn: response.expires_in || 3600,
            })
          } else {
            const error = 'No access token received'
            debugLog('error', '❌ ' + error)
            reject(new Error(error))
          }
        },
      })

      debugLog('info', '👁️ Requesting access token (popup should open)...')
      debugLog('info', '⚠️ If popup is blocked, check browser popup blocker settings')
      
      // Try to detect if popup was blocked
      try {
        // Request access token (will show popup if not already authorized)
        tokenClient.requestAccessToken({ prompt: 'consent' })
        debugLog('info', '✅ requestAccessToken() called - waiting for popup/callback...')
        
        // Check if popup was blocked (this is a best-effort check)
        setTimeout(() => {
          // If callback hasn't fired after 2 seconds, check if we can detect popup blocking
          if (!callbackFired) {
            debugLog('warn', '⏳ Still waiting for callback after 2s - popup may be blocked or user hasn\'t interacted', {
              elapsedSeconds: ((Date.now() - startTime) / 1000).toFixed(1),
            })
          }
        }, 2000)
      } catch (requestError) {
        clearTimeout(timeout)
        debugLog('error', '❌ Error calling requestAccessToken', { 
          error: requestError instanceof Error ? requestError.message : String(requestError),
          stack: requestError instanceof Error ? requestError.stack : undefined,
        })
        reject(requestError)
      }
    } catch (err) {
      clearTimeout(timeout)
      debugLog('error', '❌ Exception in getGoogleAccessToken', { 
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      logError(err instanceof Error ? err : new Error(String(err)), {
        source: 'getGoogleAccessToken',
        context: 'Google OAuth',
      })
      reject(err)
    }
  })
}

/**
 * Check if user has valid Google access token stored
 */
export function getStoredGoogleToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem('google_access_token')
  } catch {
    return null
  }
}

/**
 * Store Google access token temporarily
 */
export function storeGoogleToken(token: string, expiresIn: number): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem('google_access_token', token)
    // Store expiration time (in milliseconds)
    const expiresAt = Date.now() + expiresIn * 1000
    sessionStorage.setItem('google_token_expires_at', expiresAt.toString())
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if stored token is still valid
 */
export function isGoogleTokenValid(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const expiresAt = sessionStorage.getItem('google_token_expires_at')
    if (!expiresAt) return false
    return Date.now() < parseInt(expiresAt, 10)
  } catch {
    return false
  }
}

/**
 * Clear stored Google token
 */
export function clearGoogleToken(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem('google_access_token')
    sessionStorage.removeItem('google_token_expires_at')
  } catch {
    // Ignore storage errors
  }
}

// Extend Window interface for Google Identity Services and Picker API
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void
          }
        }
      }
      picker?: {
        PickerBuilder: new () => {
          setOAuthToken: (token: string) => unknown
          addView: (view: unknown) => unknown
          setCallback: (callback: (data: unknown) => void) => unknown
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
