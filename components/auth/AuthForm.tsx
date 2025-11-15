'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { logError } from '@/lib/errors'
import { signInWithLinkedIn } from '@/lib/auth/linkedin'

export type AuthMode = 'signin' | 'signup' | 'reset'

interface AuthFormProps {
  mode: AuthMode
  onModeChange?: (mode: AuthMode) => void
  onSuccess: () => void
  returnUrl?: string
}

/**
 * Authentication form component - Email/Password for testing, LinkedIn OAuth for production
 * Follows SOLID principles: Single Responsibility, Open/Closed
 */
export function AuthForm({ mode, onSuccess, returnUrl = '/bulk' }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      const missingVars = []
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      setError(`Authentication service unavailable. Missing environment variables: ${missingVars.join(', ')}. Please create a .env.local file with your Supabase credentials.`)
      console.error('[Auth] Missing Supabase environment variables:', missingVars)
      return
    }

    try {
      setIsLoadingEmail(true)
      setError(null)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (data?.user) {
        onSuccess()
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid login credentials'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), {
        source: 'AuthForm',
        action: 'emailSignIn',
      })
    } finally {
      setIsLoadingEmail(false)
    }
  }

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

      {/* Email/Password Form - For local testing */}
      {mode === 'signin' && (
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="test@bulkgpt.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoadingEmail}
              autocomplete="email"
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoadingEmail}
              autocomplete="current-password"
              className="h-9 text-xs"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoadingEmail}
            className="w-full h-9 text-xs"
          >
            {isLoadingEmail ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      )}

      {/* Divider */}
      {mode === 'signin' && (
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>
      )}

      {/* LinkedIn OAuth Button */}
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

      {mode === 'signin' && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          Demo: test@bulkgpt.local / Test123456!
        </p>
      )}
    </div>
  )
}
