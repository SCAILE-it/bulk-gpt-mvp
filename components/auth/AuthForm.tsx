'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { logError } from '@/lib/errors'
import { signInWithLinkedIn } from '@/lib/auth/linkedin'

export type AuthMode = 'signin' | 'signup' | 'reset'

interface AuthFormProps {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSuccess: () => void
  returnUrl?: string
}

/**
 * Authentication form component - LinkedIn OAuth only for beta
 * Follows SOLID principles: Single Responsibility, Open/Closed
 */
export function AuthForm({ returnUrl = '/bulk' }: AuthFormProps) {
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSignInWithLinkedIn = async () => {
    if (!supabase) {
      setError('Authentication service unavailable')
      return
    }

    try {
      setIsLoadingLinkedIn(true)
      setError(null)

      // Store returnUrl in cookie to restore after OAuth callback
      document.cookie = `oauth_return_url=${encodeURIComponent(returnUrl)}; path=/; max-age=600; SameSite=Lax`
      
      // Use getAuthCallbackUrl() like zola-aisdkv5 - handles Vercel URLs properly
      const data = await signInWithLinkedIn(supabase)

      if (data?.url) {
        // Redirect to LinkedIn OAuth
        window.location.href = data.url
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with LinkedIn'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), {
        source: 'AuthForm',
        action: 'signInWithLinkedIn',
      })
      setIsLoadingLinkedIn(false)
    }
  }


  return (
    <div className="space-y-4">
      {error && (
        <div
          id="form-error"
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive"
        >
          {error}
        </div>
      )}


      {/* LinkedIn OAuth Button - Only authentication method for beta */}
      <Button
        type="button"
        onClick={handleSignInWithLinkedIn}
        disabled={isLoadingLinkedIn}
        className="w-full min-h-[44px] lg:min-h-0 bg-[#0A66C2] hover:bg-[#004182] text-white"
      >
        {isLoadingLinkedIn ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Connecting...
          </>
        ) : (
          <>
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              role="img"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Continue with LinkedIn
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Beta access only. Sign in with LinkedIn to get started.
      </p>
    </div>
  )
}

