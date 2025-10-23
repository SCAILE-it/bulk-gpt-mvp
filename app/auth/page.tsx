// ABOUTME: Authentication page for user login with Supabase
// ABOUTME: Handles sign-in, validates return URLs to prevent open redirects, and redirects to wizard after auth
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
        const returnUrl = searchParams.get('returnUrl') || '/wizard'

        // Validate before redirecting (SECURITY - prevent open redirect)
        if (isValidReturnUrl(returnUrl)) {
          router.push(returnUrl)
        } else {
          // Invalid returnUrl, use safe fallback
          router.push('/wizard')
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Bulk GPT</CardTitle>
          <CardDescription>
            Sign in to start processing CSV data with AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Demo credentials: test@example.com / password
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Activity className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

