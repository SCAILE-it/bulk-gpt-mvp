/**
 * Unit tests for LinkedIn OAuth authentication utility
 * Tests the signInWithLinkedIn function
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signInWithLinkedIn } from '@/lib/auth/linkedin'
import type { SupabaseClient } from '@supabase/supabase-js'
import * as getSiteUrlModule from '@/lib/utils/get-site-url'

// Mock getAuthCallbackUrl
vi.mock('@/lib/utils/get-site-url', () => ({
  getAuthCallbackUrl: vi.fn(() => 'https://test.example.com/auth/callback'),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signInWithLinkedIn', () => {
  it('should call supabase.auth.signInWithOAuth with correct parameters', async () => {
    const mockSignInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: 'https://linkedin.com/oauth' },
      error: null,
    })

    const mockSupabase = {
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
      },
    } as unknown as SupabaseClient

    const result = await signInWithLinkedIn(mockSupabase)

    expect(getSiteUrlModule.getAuthCallbackUrl).toHaveBeenCalled()
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: 'https://test.example.com/auth/callback',
        scopes: 'openid profile email',
      },
    })

    expect(result).toEqual({ url: 'https://linkedin.com/oauth' })
  })

  it('should throw error when supabase returns an error', async () => {
    const mockError = new Error('OAuth error')
    const mockSignInWithOAuth = vi.fn().mockResolvedValue({
      data: null,
      error: mockError,
    })

    const mockSupabase = {
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
      },
    } as unknown as SupabaseClient

    await expect(signInWithLinkedIn(mockSupabase)).rejects.toThrow('OAuth error')
  })

  it('should handle errors and log them', async () => {
    const mockError = new Error('Network error')
    const mockSignInWithOAuth = vi.fn().mockRejectedValue(mockError)

    const mockSupabase = {
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
      },
    } as unknown as SupabaseClient

    await expect(signInWithLinkedIn(mockSupabase)).rejects.toThrow('Network error')
  })

  it('should use getAuthCallbackUrl for redirect URL', async () => {
    vi.mocked(getSiteUrlModule.getAuthCallbackUrl).mockReturnValue('https://custom.example.com/auth/callback')

    const mockSignInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: 'https://linkedin.com/oauth' },
      error: null,
    })

    const mockSupabase = {
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
      },
    } as unknown as SupabaseClient

    await signInWithLinkedIn(mockSupabase)

    expect(getSiteUrlModule.getAuthCallbackUrl).toHaveBeenCalled()
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: 'https://custom.example.com/auth/callback',
        scopes: 'openid profile email',
      },
    })
  })
})

