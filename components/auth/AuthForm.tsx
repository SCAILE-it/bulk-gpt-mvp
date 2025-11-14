'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { logError } from '@/lib/errors'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { validateEmail, validatePassword } from '@/lib/validation/auth'
import { ensureUserRecord } from '@/lib/auth/ensure-user'
import { signInWithLinkedIn } from '@/lib/auth/linkedin'

export type AuthMode = 'signin' | 'signup' | 'reset'

interface AuthFormProps {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSuccess: () => void
  returnUrl?: string
}

/**
 * Reusable authentication form component
 * Supports sign-in, sign-up, and password reset
 * Follows SOLID principles: Single Responsibility, Open/Closed
 */
export function AuthForm({ mode, onModeChange, onSuccess, returnUrl = '/bulk' }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const supabase = createClient()

  const handleSignInWithLinkedIn = async () => {
    if (!supabase) {
      setError('Authentication service unavailable')
      return
    }

    try {
      setIsLoadingLinkedIn(true)
      setError(null)

      const redirectUrl = `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`
      const data = await signInWithLinkedIn(supabase, redirectUrl)

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!supabase) {
      setError('Authentication service unavailable')
      return
    }

    try {
      setIsLoading(true)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (data?.user) {
        await ensureUserRecord(data.user.id, data.user.email)
        trackEvent(ANALYTICS_EVENTS.USER_SIGNED_IN, { email: data.user.email })
        onSuccess()
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), {
        source: 'AuthForm',
        action: 'signIn',
        email,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters and contain both letters and numbers')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!supabase) {
      setError('Authentication service unavailable')
      return
    }

    try {
      setIsLoading(true)

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`,
        },
      })

      if (signUpError) {
        throw signUpError
      }

      if (data?.user) {
        await ensureUserRecord(data.user.id, data.user.email)
        trackEvent(ANALYTICS_EVENTS.USER_SIGNED_UP, { email: data.user.email })
        
        // Check if email confirmation is required
        if (data.user.confirmed_at) {
          // Email already confirmed (may happen in development)
          onSuccess()
        } else {
          // Email confirmation required
          setSuccessMessage('Please check your email to confirm your account before signing in.')
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), {
        source: 'AuthForm',
        action: 'signUp',
        email,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!supabase) {
      setError('Authentication service unavailable')
      return
    }

    try {
      setIsLoading(true)

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      setSuccessMessage('Password reset email sent. Please check your inbox.')
      trackEvent(ANALYTICS_EVENTS.PASSWORD_RESET_REQUESTED, { email })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email'
      setError(errorMessage)
      logError(err instanceof Error ? err : new Error(errorMessage), {
        source: 'AuthForm',
        action: 'passwordReset',
        email,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    if (mode === 'signin') {
      handleSignIn(e)
    } else if (mode === 'signup') {
      handleSignUp(e)
    } else {
      handlePasswordReset(e)
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

      {successMessage && (
        <div
          id="form-success"
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-400"
        >
          {successMessage}
        </div>
      )}

      {/* LinkedIn OAuth Button - Show only on sign-in */}
      {mode === 'signin' && (
        <>
          <Button
            type="button"
            onClick={handleSignInWithLinkedIn}
            disabled={isLoadingLinkedIn || isLoading}
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">
            Email
          </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
          autocomplete="email"
          aria-describedby={error ? 'form-error' : successMessage ? 'form-success' : undefined}
          aria-invalid={!!error}
        />
      </div>

      {mode !== 'reset' && (
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
              aria-describedby={error ? 'form-error' : undefined}
              aria-invalid={!!error}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center sm:min-w-0 sm:min-h-0"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mode === 'signup' && (
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with letters and numbers
            </p>
          )}
        </div>
      )}

      {mode === 'signup' && (
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-xs font-medium">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
              autocomplete="new-password"
              aria-describedby={error ? 'form-error' : undefined}
              aria-invalid={!!error}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center sm:min-w-0 sm:min-h-0"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full min-h-[44px] lg:min-h-0" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {mode === 'signin' && 'Signing in...'}
            {mode === 'signup' && 'Creating account...'}
            {mode === 'reset' && 'Sending reset email...'}
          </>
        ) : (
          <>
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'reset' && 'Send reset email'}
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-xs">
        {mode === 'signin' && (
          <>
            <button
              type="button"
              onClick={() => onModeChange('signup')}
              className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
            >
              Don&apos;t have an account? Sign up
            </button>
            <button
              type="button"
              onClick={() => onModeChange('reset')}
              className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
            >
              Forgot password?
            </button>
          </>
        )}
        {mode === 'signup' && (
          <button
            type="button"
            onClick={() => onModeChange('signin')}
            className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
          >
            Already have an account? Sign in
          </button>
        )}
        {mode === 'reset' && (
          <button
            type="button"
            onClick={() => onModeChange('signin')}
            className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
          >
            Back to sign in
          </button>
        )}
      </div>
      </form>
    </div>
  )
}

