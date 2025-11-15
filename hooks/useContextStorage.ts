/**
 * ABOUTME: Hook for managing company context variables
 * ABOUTME: Stores context in localStorage for persistence across sessions
 */

import { useState, useCallback, useEffect } from 'react'
import type { ContextVariables } from '@/lib/types'

const STORAGE_KEY = 'bulk-gpt-context-variables'

const DEFAULT_CONTEXT: ContextVariables = {}

export interface UseContextStorageReturn {
  context: ContextVariables
  updateContext: (updates: Partial<ContextVariables>) => void
  clearContext: () => void
  hasContext: boolean
}

/**
 * Manages company context variables with localStorage persistence
 * 
 * @returns Context management functions
 * 
 * @example
 * const { context, updateContext, clearContext } = useContextStorage()
 * 
 * // Update a field
 * updateContext({ tone: 'Professional' })
 * 
 * // Clear all context
 * clearContext()
 */
export function useContextStorage(): UseContextStorageReturn {
  const [context, setContext] = useState<ContextVariables>(DEFAULT_CONTEXT)

  // Load context from localStorage on mount (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ContextVariables
        // Validate structure
        if (parsed && typeof parsed === 'object') {
          setContext(parsed)
        }
      }
    } catch (error) {
      // Corrupted data or localStorage disabled - silently fail
      console.debug('Failed to load context from localStorage:', error)
    }
  }, [])

  // Update context and save to localStorage
  const updateContext = useCallback((updates: Partial<ContextVariables>) => {
    if (typeof window === 'undefined') return

    setContext((current: ContextVariables) => {
      const updated = {
        ...current,
        ...updates,
      }

      // Remove undefined values
      Object.keys(updated).forEach((key) => {
        if (updated[key as keyof ContextVariables] === undefined) {
          delete updated[key as keyof ContextVariables]
        }
      })

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        // LocalStorage might be disabled or full - silently fail
        console.debug('Failed to save context to localStorage:', error)
      }

      return updated
    })
  }, [])

  // Clear context from localStorage
  const clearContext = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(STORAGE_KEY)
      setContext(DEFAULT_CONTEXT)
    } catch (error) {
      console.debug('Failed to clear context from localStorage:', error)
    }
  }, [])

  // Check if any context is set
  const hasContext = Object.keys(context).some(
    (key) => context[key as keyof ContextVariables] !== undefined && 
             context[key as keyof ContextVariables] !== ''
  )

  return {
    context,
    updateContext,
    clearContext,
    hasContext,
  }
}

