// ABOUTME: Authentication page for user login with Supabase
// ABOUTME: Handles sign-in, validates return URLs to prevent open redirects, and redirects to wizard after auth
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Activity } from "lucide-react"

// Validate returnUrl to prevent open redirect attacks
function isValidReturnUrl(url: string): boolean {
  // Must start with / but not //
  if (!url.startsWith('/') || url.startsWith('//')) {
    return false
  }
  // No protocol (prevents http://evil.com)
  if (url.includes(':')) {
    return false
  }
  return true
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()

    if (!supabase) {
      setError("Authentication service unavailable")
      return
    }

    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (data?.user) {
        // Ensure user record exists in public.users table (optional, non-blocking)
        try {
          await fetch('/api/auth/ensure-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, email: data.user.email })
          })
        } catch {
          // Silently ignore - table may not exist in development
        }

        // Get returnUrl from query params with validation
        const returnUrl = searchParams.get('returnUrl') || '/bulk'

        // Validate before redirecting (SECURITY - prevent open redirect)
        if (isValidReturnUrl(returnUrl)) {
          router.push(returnUrl)
        } else {
          // Invalid returnUrl, use safe fallback
          router.push('/bulk')
        }

        router.refresh()
      }
    } catch (err: unknown) {
      console.error("Error signing in:", err)
      setError(err instanceof Error ? err.message : "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-6 text-center border-b border-border">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-sm font-medium tracking-tight text-foreground mb-1">Welcome to Bulk GPT</h1>
          <p className="text-xs text-muted-foreground">
            Sign in to start processing CSV data with AI
          </p>
        </div>
        <div className="px-6 py-6">
          <form onSubmit={handleSignIn} className="space-y-4">
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

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autocomplete="email"
                aria-describedby={error ? "form-error" : undefined}
                aria-invalid={!!error}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                autocomplete="current-password"
                aria-describedby={error ? "form-error" : undefined}
                aria-invalid={!!error}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo credentials: test@bulkgpt.local / Test123456!
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <h1 className="text-sm font-medium tracking-tight text-foreground">Loading...</h1>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

