'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize analytics on mount (async)
    analytics.init().catch((error) => {
      // Silently fail if analytics initialization fails
      console.error('Analytics initialization failed:', error)
    })
  }, [])
  
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}




