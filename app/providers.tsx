'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { initWebVitals } from '@/lib/analytics/web-vitals'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Web Vitals tracking
    initWebVitals()
    
    // Initialize analytics on mount (async) if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { analytics } = require('@/lib/analytics')
      if (analytics?.init) {
        analytics.init().catch((error: unknown) => {
          // Silently fail if analytics initialization fails
          console.error('Analytics initialization failed:', error)
        })
      }
    } catch (error: unknown) {
      // Analytics module not available, continue without it
    }
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




