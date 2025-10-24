/**
 * Production-grade focus trap hook for modal dialogs
 *
 * Features:
 * - Traps focus within modal (Tab/Shift+Tab cycling)
 * - Restores focus to trigger element on close
 * - Auto-focuses first focusable element
 * - Handles edge cases (no focusable elements, disabled elements)
 * - Proper cleanup
 *
 * Usage:
 * ```tsx
 * const modalRef = useFocusTrap(isOpen)
 *
 * {isOpen && (
 *   <div ref={modalRef} role="dialog">
 *     Modal content
 *   </div>
 * )}
 * ```
 */

import { useEffect, useRef } from 'react'

/**
 * CSS selector for all focusable elements
 * Includes: links, buttons, inputs, textareas, selects, details, and elements with tabindex
 */
const FOCUSABLE_ELEMENTS_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'details',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []

  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR)
  return Array.from(elements).filter((el) => {
    // Filter out elements that are hidden or have display: none
    return el.offsetParent !== null && !el.hasAttribute('disabled')
  })
}

/**
 * Focus trap hook for modal dialogs
 *
 * @param isActive - Whether the focus trap is active (typically tied to modal open state)
 * @param options - Configuration options
 * @returns Ref to attach to the modal container
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isActive: boolean,
  options: {
    /**
     * Auto-focus first element when modal opens
     * @default true
     */
    autoFocus?: boolean
    /**
     * Restore focus to trigger element when modal closes
     * @default true
     */
    restoreFocus?: boolean
    /**
     * Initial focus target selector (e.g., '[data-autofocus]')
     * If not found, falls back to first focusable element
     */
    initialFocusSelector?: string
  } = {}
) {
  const { autoFocus = true, restoreFocus = true, initialFocusSelector } = options

  const containerRef = useRef<T>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the element that had focus before opening the modal
    previousActiveElementRef.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    // Auto-focus first element
    if (autoFocus) {
      const focusableElements = getFocusableElements(container)

      // Try initial focus selector first
      let initialFocusElement: HTMLElement | null = null
      if (initialFocusSelector) {
        initialFocusElement = container.querySelector(initialFocusSelector)
      }

      // Fallback to first focusable element
      const elementToFocus = initialFocusElement || focusableElements[0]

      if (elementToFocus) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          elementToFocus.focus()
        }, 0)
      }
    }

    /**
     * Handle Tab and Shift+Tab to trap focus
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(container)

      // If no focusable elements, prevent tabbing
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement as HTMLElement

      // Shift+Tab on first element -> focus last element
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
      // Tab on last element -> focus first element
      else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    // Attach event listener
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus to previous element
      if (restoreFocus && previousActiveElementRef.current) {
        // Use setTimeout to ensure modal is removed from DOM
        setTimeout(() => {
          previousActiveElementRef.current?.focus()
        }, 0)
      }
    }
  }, [isActive, autoFocus, restoreFocus, initialFocusSelector])

  return containerRef
}
