'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize analytics on mount
    analytics.init()
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




