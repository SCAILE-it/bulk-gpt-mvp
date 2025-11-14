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

    // Return the provider URL
    return data
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      source: 'signInWithLinkedIn',
      context: 'LinkedIn OAuth',
    })
    throw err
  }
}

