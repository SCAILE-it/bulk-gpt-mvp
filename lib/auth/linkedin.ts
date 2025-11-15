/**
 * ABOUTME: LinkedIn OAuth authentication utility
 * ABOUTME: Follows zola-aisdkv5 pattern for consistency
 */

'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { logError } from '@/lib/errors'
import { getAuthCallbackUrl } from '@/lib/utils/get-site-url'

/**
 * Signs in user with LinkedIn OAuth via Supabase
 * Accept any SupabaseClient with Database schema, regardless of SSR implementation details
 * @param supabase - Supabase client instance
 * @returns OAuth URL data
 */
export async function signInWithLinkedIn(
  supabase: SupabaseClient
) {
  try {
    const redirectUrl = getAuthCallbackUrl()
    
    // Debug logging for localhost development
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[LinkedIn OAuth] 🔍 Debug Info:', {
        redirectUrl,
        currentOrigin: window.location.origin,
        currentUrl: window.location.href,
        note: 'Make sure http://localhost:3000/auth/callback is added to Supabase → Authentication → Providers → LinkedIn → Redirect URLs'
      })
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: redirectUrl,
        scopes: 'openid profile email',
      },
    })

    if (error) {
      // Provide helpful error message for localhost development
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('[LinkedIn OAuth] ❌ Error:', error)
        console.error('[LinkedIn OAuth] 💡 Fix: Add http://localhost:3000/auth/callback to Supabase Dashboard → Authentication → Providers → LinkedIn → Redirect URLs')
      }
      throw error
    }

    // Return the provider URL
    return data
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      source: 'signInWithLinkedIn',
      context: 'LinkedIn OAuth',
      redirectUrl: typeof window !== 'undefined' ? getAuthCallbackUrl() : 'unknown',
    })
    throw err
  }
}

