import { expect, afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { server } from './__tests__/mocks/server'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Setup MSW server
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
  cleanup()
})

afterAll(() => {
  server.close()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock DataTransfer for drag-and-drop tests
global.DataTransfer = class DataTransfer {
  items: any
  files: any[]

  constructor() {
    this.files = []
    this.items = {
      add: (file: File) => {
        this.files.push(file)
      }
    }
  }
} as any

// Mock DragEvent for drag-and-drop tests
global.DragEvent = class DragEvent extends Event {
  dataTransfer: any

  constructor(type: string, eventInitDict?: EventInit & { dataTransfer?: any }) {
    super(type, eventInitDict)
    this.dataTransfer = eventInitDict?.dataTransfer || new DataTransfer()
  }
} as any

