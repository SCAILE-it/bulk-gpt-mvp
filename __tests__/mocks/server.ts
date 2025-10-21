/**
 * MSW server setup for tests
 *
 * This creates a mock server that intercepts HTTP requests during tests
 * and returns mock responses defined in handlers.ts
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup server with default handlers
export const server = setupServer(...handlers)

// Start server before all tests
export function setupMSW() {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' })
  })

  // Reset handlers after each test
  afterEach(() => {
    server.resetHandlers()
  })

  // Clean up after all tests
  afterAll(() => {
    server.close()
  })
}
