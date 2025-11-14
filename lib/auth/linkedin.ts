/**
 * ABOUTME: LinkedIn OAuth authentication utility
 * ABOUTME: Follows zola-aisdkv5 pattern for consistency
 * ABOUTME: Client-side only - uses window.location
 */

'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { logError } from '@/lib/errors'

/**
 * Signs in user with LinkedIn OAuth via Supabase
 * @param supabase - Supabase client instance
 * @param redirectTo - Optional redirect URL after authentication
 * @returns OAuth URL data
 */
export async function signInWithLinkedIn(
  supabase: SupabaseClient,
  redirectTo?: string
) {
  try {
    // Client-side only - window.location is safe here
    const redirectUrl = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: redirectUrl,
        scopes: 'openid profile email',
      },
    })

    if (error) {
      throw error
    }

    return data
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      source: 'signInWithLinkedIn',
      context: 'LinkedIn OAuth',
    })
    throw err
  }
}

