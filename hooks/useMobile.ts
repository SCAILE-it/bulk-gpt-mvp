/**
 * useMobile Hook
 * 
 * Detects mobile/tablet viewport and provides responsive utilities.
 */

import { useState, useEffect } from 'react'

interface UseMobileReturn {
  /** True if viewport is mobile (< 640px) */
  isMobile: boolean
  /** True if viewport is tablet (640px - 1024px) */
  isTablet: boolean
  /** True if viewport is desktop (> 1024px) */
  isDesktop: boolean
  /** Viewport width */
  width: number
}

/**
 * Hook to detect mobile/tablet/desktop viewport
 */
export function useMobile(): UseMobileReturn {
  const [state, setState] = useState<UseMobileReturn>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
      }
    }

    const width = window.innerWidth
    return {
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
      width,
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const width = window.innerWidth
      setState({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        width,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return state
}

