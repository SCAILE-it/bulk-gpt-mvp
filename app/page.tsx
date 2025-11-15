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

    async function checkAuth() {
      // Mark as redirected immediately to prevent multiple calls
      hasRedirected.current = true

      try {
        const supabase = createClient()
        if (!supabase) {
          console.error('Supabase client not available - check environment variables')
          router.replace('/auth')
          return
        }

        // Add timeout to prevent hanging
        const authPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 3000)
        )

        const result = await Promise.race([
          authPromise,
          timeoutPromise
        ])
        
        const { data: { user }, error } = result
        
        if (error) {
          console.error('Auth check error:', error)
          router.replace('/auth')
          return
        }

        if (user) {
          router.replace('/bulk')
        } else {
          router.replace('/auth')
        }
      } catch (err) {
        console.error('Error checking auth:', err)
        // On timeout or error, redirect to auth page
        router.replace('/auth')
      }
    }
    
    checkAuth()
  }, [router, pathname])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
