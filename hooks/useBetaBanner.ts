/**
 * ABOUTME: Custom hook for managing beta feature banner state
 * ABOUTME: Handles banner visibility, dismissal, and usage stats fetching
 */

import { useState, useEffect } from 'react'

export interface UsageStats {
  batchesToday: number
  dailyBatchLimit: number
}

export interface BetaBannerResult {
  /** Whether the beta banner should be shown */
  showBanner: boolean
  /** Current usage statistics (null if not loaded) */
  usage: UsageStats | null
  /** Dismiss the beta banner and persist to localStorage */
  dismissBanner: () => void
}

/**
 * Manages beta banner visibility and usage stats
 *
 * Fetches usage statistics on mount and manages banner dismissal state
 * using localStorage for persistence across sessions.
 *
 * @param storageKey - LocalStorage key for banner dismissal (default: 'bulk-beta-banner-dismissed')
 * @param usageEndpoint - API endpoint to fetch usage stats (default: '/api/usage')
 * @returns Beta banner state, usage stats, and dismiss handler
 *
 * @example
 * const { showBanner, usage, dismissBanner } = useBetaBanner()
 * {showBanner && (
 *   <BetaBanner usage={usage} onDismiss={dismissBanner} />
 * )}
 */
export function useBetaBanner(
  storageKey = 'bulk-beta-banner-dismissed',
  usageEndpoint = '/api/usage'
): BetaBannerResult {
  // Initialize banner state from localStorage (SSR-safe)
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(storageKey) !== 'true'
  })

  const [usage, setUsage] = useState<UsageStats | null>(null)

  // Fetch usage stats on mount
  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch(usageEndpoint)
        if (response.ok) {
          const data = await response.json()
          setUsage({
            batchesToday: data.batchesToday,
            dailyBatchLimit: data.dailyBatchLimit
          })
        }
      } catch (error) {
        // Silently fail - usage counter is nice-to-have
        console.warn('Failed to fetch usage stats for beta banner:', error)
      }
    }
    fetchUsage()
  }, [usageEndpoint])

  // Dismiss banner and persist to localStorage
  const dismissBanner = () => {
    localStorage.setItem(storageKey, 'true')
    setShowBanner(false)
  }

  return {
    showBanner,
    usage,
    dismissBanner
  }
}
