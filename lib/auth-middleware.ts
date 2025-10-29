/**
 * ABOUTME: Unified authentication middleware for API endpoints
 * ABOUTME: Supports cookie session, Bearer token, and API key authentication
 */

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/api-keys'

/**
 * Authenticate a request and return the user ID
 *
 * Supports three auth methods (in order of precedence):
 * 1. API key: Authorization: Bearer bgpt_xxx
 * 2. Session token: Authorization: Bearer <session_token>
 * 3. Cookie-based session
 */
export async function authenticateRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')

  // Method 1: API Key (starts with "bgpt_")
  if (authHeader?.startsWith('Bearer bgpt_')) {
    const apiKey = authHeader.slice(7) // Remove "Bearer "
    return await verifyApiKey(apiKey)
  }

  // Method 2 & 3: Session token or cookie
  const supabase = await createServerSupabaseClient()

  if (authHeader?.startsWith('Bearer ')) {
    // Method 2: Bearer token (not API key)
    const token = authHeader.slice(7)
    const { data, error } = await supabase.auth.getUser(token)
    return error || !data.user ? null : data.user.id
  }

  // Method 3: Cookie-based session
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : user.id
}
