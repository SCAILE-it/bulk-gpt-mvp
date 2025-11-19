/**
 * useResponsive Hook
 * 
 * Provides responsive breakpoint utilities for mobile-first design.
 * Helps ensure touch targets and spacing are appropriate for mobile devices.
 */

'use client'

import { useState, useEffect } from 'react'

export interface ResponsiveState {
  /** Is extra small device (< 475px) */
  isXS: boolean
  /** Is mobile device (< 640px) */
  isMobile: boolean
  /** Is small tablet device (640px - 768px) */
  isSM: boolean
  /** Is tablet device (768px - 1024px) */
  isTablet: boolean
  /** Is medium desktop (1024px - 1280px) */
  isMD: boolean
  /** Is large desktop (1280px - 1536px) */
  isLG: boolean
  /** Is extra large desktop (> 1536px) */
  isXL: boolean
  /** Is desktop device (> 1024px) - legacy support */
  isDesktop: boolean
  /** Current window width */
  width: number
  /** Current window height */
  height: number
  /** Is touch device */
  isTouch: boolean
}

const BREAKPOINTS = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

/**
 * Hook for responsive design utilities.
 * 
 * Usage:
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useResponsive()
 * 
 * return (
 *   <Button size={isMobile ? 'sm' : 'md'}>
 *     Click me
 *   </Button>
 * )
 * ```
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        isXS: false,
        isMobile: false,
        isSM: false,
        isTablet: false,
        isMD: false,
        isLG: false,
        isXL: false,
        isDesktop: true,
        width: 0,
        height: 0,
        isTouch: false,
      }
    }

    const width = window.innerWidth
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    return {
      isXS: width < BREAKPOINTS.xs,
      isMobile: width < BREAKPOINTS.sm,
      isSM: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isMD: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
      isLG: width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'],
      isXL: width >= BREAKPOINTS['2xl'],
      isDesktop: width >= BREAKPOINTS.lg,
      width,
      height: window.innerHeight,
      isTouch,
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      setState({
        isXS: width < BREAKPOINTS.xs,
        isMobile: width < BREAKPOINTS.sm,
        isSM: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
        isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
        isMD: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
        isLG: width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'],
        isXL: width >= BREAKPOINTS['2xl'],
        isDesktop: width >= BREAKPOINTS.lg,
        width,
        height,
        isTouch,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return state
}

/**
 * Hook for mobile-specific utilities.
 * 
 * Usage:
 * ```tsx
 * const isMobile = useIsMobile()
 * ```
 */
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive()
  return isMobile
}

/**
 * Hook for touch device detection.
 * 
 * Usage:
 * ```tsx
 * const isTouch = useIsTouch()
 * ```
 */
export function useIsTouch(): boolean {
  const { isTouch } = useResponsive()
  return isTouch
}

