import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './playwright-tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium-audit',
      use: {
        ...devices['Desktop Chrome'],
        // No auth - just audit the UI
      },
    },
  ],
})
