/**
 * Test utilities for rendering components with necessary providers
 *
 * This file provides helpers for rendering React components in tests
 * with all necessary context providers and mock setup.
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Custom render function that wraps components with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Add providers here as needed (ThemeProvider, etc.)
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options }),
  }
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const storage: Record<string, string> = {}

  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value
    },
    removeItem: (key: string) => {
      delete storage[key]
    },
    clear: () => {
      Object.keys(storage).forEach(key => delete storage[key])
    },
    get length() {
      return Object.keys(storage).length
    },
    key: (index: number) => {
      const keys = Object.keys(storage)
      return keys[index] || null
    },
  }
}

/**
 * Mock fetch for tests that need it
 */
export function mockFetch(responses: Array<{ url: string | RegExp; response: any }>) {
  const originalFetch = global.fetch

  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()

    for (const mock of responses) {
      const matches =
        typeof mock.url === 'string'
          ? url === mock.url
          : mock.url.test(url)

      if (matches) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mock.response),
          text: () => Promise.resolve(JSON.stringify(mock.response)),
        } as Response)
      }
    }

    return Promise.reject(new Error(`No mock found for ${url}`))
  })

  return () => {
    global.fetch = originalFetch
  }
}

/**
 * Create a mock File object for upload testing
 */
export function createMockFile(
  content: string,
  filename: string,
  type = 'text/csv'
): File {
  const blob = new Blob([content], { type })
  return new File([blob], filename, { type })
}

/**
 * Trigger a file input change event
 */
export async function uploadFile(fileInput: HTMLInputElement, file: File) {
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(file)

  Object.defineProperty(fileInput, 'files', {
    value: dataTransfer.files,
    writable: false,
  })

  const event = new Event('change', { bubbles: true })
  fileInput.dispatchEvent(event)
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { userEvent }
