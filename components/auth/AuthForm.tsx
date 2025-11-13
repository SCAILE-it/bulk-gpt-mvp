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
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const supabase = createClient()

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
    <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="new-password"
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
  )
}

