/**
 * useResponsive Hook
 * 
 * Provides responsive breakpoint utilities for mobile-first design.
 * Helps ensure touch targets and spacing are appropriate for mobile devices.
 */

'use client'

import { useState, useEffect } from 'react'

export interface ResponsiveState {
  /** Is mobile device (< 640px) */
  isMobile: boolean
  /** Is tablet device (640px - 1024px) */
  isTablet: boolean
  /** Is desktop device (> 1024px) */
  isDesktop: boolean
  /** Current window width */
  width: number
  /** Current window height */
  height: number
  /** Is touch device */
  isTouch: boolean
}

const MOBILE_BREAKPOINT = 640
const TABLET_BREAKPOINT = 1024

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
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 0,
        height: 0,
        isTouch: false,
      }
    }

    const width = window.innerWidth
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    return {
      isMobile: width < MOBILE_BREAKPOINT,
      isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: width >= TABLET_BREAKPOINT,
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
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT,
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

