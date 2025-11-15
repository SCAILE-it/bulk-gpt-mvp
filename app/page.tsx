'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Prevent redirect loop - if we're already on /auth or /bulk, don't redirect
    if (pathname !== '/') {
      return
    }

    async function checkAuth() {
      try {
        const supabase = createClient()
        if (!supabase) {
          console.error('Supabase client not available - check environment variables')
          router.replace('/auth')
          return
        }

        const { data: { user }, error } = await supabase.auth.getUser()
        
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
