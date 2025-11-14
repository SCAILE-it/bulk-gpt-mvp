/**
 * Unit tests for LinkedIn OAuth authentication utility
 * Tests the signInWithLinkedIn function
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signInWithLinkedIn } from '@/lib/auth/linkedin'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock window.location
const mockWindowLocation = {
  origin: 'https://test.example.com',
  href: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  // Reset window.location mock
  mockWindowLocation.href = ''
  Object.defineProperty(window, 'location', {
    value: mockWindowLocation,
    writable: true,
  })
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

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: 'https://test.example.com/auth/callback',
        scopes: 'openid profile email',
      },
    })

    expect(result).toEqual({ url: 'https://linkedin.com/oauth' })
  })

  it('should use provided redirectTo URL when given', async () => {
    const mockSignInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: 'https://linkedin.com/oauth' },
      error: null,
    })

    const mockSupabase = {
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
      },
    } as unknown as SupabaseClient

    const customRedirect = 'https://custom.example.com/callback'
    await signInWithLinkedIn(mockSupabase, customRedirect)

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: customRedirect,
        scopes: 'openid profile email',
      },
    })
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

  it('should handle missing window.location gracefully', async () => {
    // Mock window as undefined (SSR scenario)
    const originalWindow = global.window
    // @ts-expect-error - intentionally removing for test
    global.window = undefined

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

    // Should fallback to '/auth/callback' when window.location is undefined
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: '/auth/callback',
        scopes: 'openid profile email',
      },
    })

    // Restore window
    global.window = originalWindow
  })
})

