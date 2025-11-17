'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Prevent redirect loop - only redirect once and only from root path
    if (pathname !== '/' || hasRedirected.current) {
      return
    }

    // Mark as redirected immediately to prevent multiple calls
    hasRedirected.current = true

    async function checkAuth() {
      try {
        const supabase = createClient()
        if (!supabase) {
          // Fallback: use window.location if router doesn't work
          window.location.href = '/auth'
          return
        }

        // Use a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          window.location.href = '/auth'
        }, 2000)

        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser()
          clearTimeout(timeoutId)
          
          if (authError || !user) {
            window.location.href = '/auth'
          } else {
            window.location.href = '/home'
          }
        } catch (authErr) {
          clearTimeout(timeoutId)
          window.location.href = '/auth'
        }
      } catch (err) {
        // Fallback redirect
        window.location.href = '/auth'
      }
    }
    
    checkAuth()
  }, [router, pathname])

  // Minimal render - redirect happens immediately
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
