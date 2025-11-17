// ABOUTME: Authentication page with sign-in, sign-up, and password reset
// ABOUTME: Uses reusable AuthForm component following DRY principles
"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthForm, type AuthMode } from "@/components/auth/AuthForm"
import { Logo } from "@/components/brand/Logo"

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

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('signin')

  const handleSuccess = () => {
    // Get returnUrl from query params with validation
    const returnUrl = searchParams.get('returnUrl') || '/agents'

    // Validate before redirecting (SECURITY - prevent open redirect)
    if (isValidReturnUrl(returnUrl)) {
      router.push(returnUrl)
    } else {
      // Invalid returnUrl, use safe fallback
      router.push('/agents')
    }

    router.refresh()
  }

  const getTitle = (): string => {
    return 'Welcome to Bulk GPT'
  }

  const getDescription = (): string => {
    return 'Sign in with email/password or LinkedIn to start processing CSV data with AI'
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <div id="main-content" className="w-full max-w-md bg-card border border-border rounded-lg overflow-hidden shadow-lg" tabIndex={-1}>
        <div className="px-6 py-6 text-center border-b border-border">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-base font-semibold tracking-tight text-foreground mb-1">{getTitle()}</h1>
          <p className="text-sm text-muted-foreground">
            {getDescription()}
          </p>
        </div>
        <div className="px-6 py-6">
          <AuthForm
            mode={mode}
            onModeChange={setMode}
            onSuccess={handleSuccess}
            returnUrl={searchParams.get('returnUrl') || '/agents'}
          />
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-sm font-medium tracking-tight text-foreground">Loading...</h1>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
}

