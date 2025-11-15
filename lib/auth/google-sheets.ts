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

// Scopes needed for Google Sheets integration
// drive.readonly: Read-only access to list/search user's files (needed for file picker/search)
// drive.file: Create and access files created by the app (needed for creating new sheets)
// Note: Using space-separated scopes - Google OAuth supports multiple scopes
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'

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
    let timeoutId: NodeJS.Timeout | null = null

    // Use Google Identity Services token client - matching test file pattern exactly
    debugLog('info', '🏗️ Creating token client...')
    debugLog('info', '📋 OAuth Configuration', {
      clientId: GOOGLE_CLIENT_ID.substring(0, 20) + '...',
      scopes: SCOPES,
      currentOrigin: window.location.origin,
      currentUrl: window.location.href,
    })
    
    // Listen for postMessage events (Google Identity Services might use this)
    const messageHandler = (event: MessageEvent) => {
      debugLog('info', '📨 PostMessage received', {
        origin: event.origin,
        data: event.data,
        source: event.source === window ? 'same window' : 'popup/iframe',
      })
      // Google Identity Services might send messages via postMessage
      if (event.origin.includes('google.com') || event.origin.includes('googleapis.com')) {
        debugLog('info', '🔍 Google postMessage detected', { data: event.data })
      }
    }
    window.addEventListener('message', messageHandler)
    
    // Clean up message listener when callback fires or timeout
    const cleanup = () => {
      window.removeEventListener('message', messageHandler)
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).__googleOAuthCallback
      }
    }
    
    // Define callback FIRST (before creating tokenClient) - matching test file pattern
    const oauthCallback = (response: { access_token?: string; error?: string; error_description?: string; expires_in?: number }) => {
      callbackFired = true
      if (timeoutId) clearTimeout(timeoutId)
      cleanup()
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      
      debugLog('success', `🎉 OAuth callback fired after ${elapsed}s`, {
        hasError: !!response.error,
        hasAccessToken: !!response.access_token,
        error: response.error,
        errorDescription: response.error_description,
        tokenLength: response.access_token?.length,
        expiresIn: response.expires_in,
        fullResponse: response,
      })

      if (response.error) {
        let errorMessage = response.error
        if (response.error === 'redirect_uri_mismatch') {
          errorMessage = `OAuth configuration error: redirect_uri_mismatch. Current origin: ${window.location.origin}. Please check GOOGLE_OAUTH_SETUP.md and ensure ${window.location.origin} is in Authorized JavaScript origins.`
        } else if (response.error === 'access_denied') {
          errorMessage = 'Access denied. Check OAuth consent screen configuration in Google Cloud Console. Ensure app is published (not in Testing mode).'
        } else if (response.error_description) {
          errorMessage = `${response.error}: ${response.error_description}`
        }
        debugLog('error', '❌ OAuth error in callback', { error: errorMessage, fullError: response })
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
        const error = 'No access token received in callback response'
        debugLog('error', '❌ ' + error, { fullResponse: response })
        reject(new Error(error))
      }
    }
    
    // Store callback reference globally for debugging (in case it gets lost)
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__googleOAuthCallback = oauthCallback
      debugLog('info', '🔧 Callback stored globally for debugging: window.__googleOAuthCallback')
    }
    
    // Set up timeout with cleanup
    timeoutId = setTimeout(() => {
      if (!callbackFired) {
        cleanup()
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        debugLog('error', `⏱️ TIMEOUT after ${elapsed}s - OAuth callback never fired`, {
          elapsedSeconds: elapsed,
          troubleshooting: [
            'Popup may have closed before completing authorization',
            'Check browser console in the popup window for errors',
            'Verify OAuth consent screen is published (not in Testing mode)',
            `Verify ${window.location.origin} is in Authorized JavaScript origins`,
            'Try clearing browser cache/cookies and retry',
            'Check if popup URL shows redirect_uri_mismatch error',
            'Right-click popup → Inspect → Console to see Google errors',
            `Manual check: Open ${window.location.origin} in Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized JavaScript origins`,
          ],
        })
        reject(new Error(`OAuth timeout after ${elapsed}s. The popup may have been blocked, closed prematurely, or there may be an OAuth configuration issue. Check Debug Logger for details.`))
      }
    }, 60000)
    
    try {
      // Create token client with callback - matching test file pattern exactly
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: oauthCallback,
      })

      debugLog('info', '👁️ Requesting access token (popup should open)...')
      debugLog('info', '💡 IMPORTANT: Complete authorization in popup and wait for it to close automatically')
      debugLog('info', '🔍 DEBUG: If callback never fires, check popup console (right-click popup → Inspect)')
      debugLog('info', `🔍 DEBUG: Verify ${window.location.origin} is in Google Cloud Console → Credentials → Authorized JavaScript origins`)
      debugLog('info', `🔍 DEBUG: Current URL: ${window.location.href}`)
      debugLog('info', '🔍 DEBUG: For GSI popup flow, redirect URIs are NOT needed - only JavaScript origins matter')
      debugLog('info', '🔍 DEBUG: If popup shows error, right-click popup → Inspect → Console to see Google error')
      
      // Add manual callback trigger for debugging
      debugLog('info', '🔧 Manual callback available: window.__googleOAuthCallback({ access_token: "test" })')
      
      // Note: We can't directly monitor popup window due to CORS restrictions
      // But postMessage listener above will catch any messages from Google
      
      // Request access token - matching test file pattern exactly
      try {
        tokenClient.requestAccessToken({ prompt: 'consent' })
        debugLog('info', '✅ requestAccessToken() called - callback registered, waiting for popup...')
        debugLog('info', '⏳ Waiting for OAuth callback... (check popup window console if it takes > 10s)')
        
        // Add periodic check to see if callback is still registered
        let checkCount = 0
        const callbackCheckInterval = setInterval(() => {
          checkCount++
          const callbackStillExists = typeof (window as unknown as Record<string, unknown>).__googleOAuthCallback === 'function'
          if (checkCount % 10 === 0) { // Log every 5 seconds
            debugLog('info', `⏱️ Still waiting... (${checkCount * 0.5}s elapsed)`, {
              callbackStillRegistered: callbackStillExists,
              instruction: 'If popup closed, RIGHT-CLICK POPUP → Inspect → Console to see Google errors',
            })
          }
          if (!callbackStillExists && callbackFired === false) {
            debugLog('warn', '⚠️ Callback function was removed but callback never fired!', {
              elapsedSeconds: checkCount * 0.5,
            })
            clearInterval(callbackCheckInterval)
          }
        }, 500)
        
        // Wrap callback to clear interval when it fires
        const originalCallback = oauthCallback
        const wrappedCallback = (response: { access_token?: string; error?: string; error_description?: string; expires_in?: number }) => {
          clearInterval(callbackCheckInterval)
          originalCallback(response)
        }
        
        // Update the global callback reference to use wrapped version
        if (typeof window !== 'undefined') {
          (window as unknown as Record<string, unknown>).__googleOAuthCallback = wrappedCallback
        }
        
        // Note: We can't update tokenClient callback after creation, but the global reference helps with debugging
      } catch (requestError) {
        debugLog('error', '❌ Error calling requestAccessToken', {
          error: requestError instanceof Error ? requestError.message : String(requestError),
          stack: requestError instanceof Error ? requestError.stack : undefined,
        })
        if (timeoutId) clearTimeout(timeoutId)
        throw requestError
      }
      
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
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
          LOADED: string
          CANCEL: string
        }
      }
    }
  }
}

