import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './playwright-tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3334',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    // Main tests with real auth - uses email/password login
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved authenticated session for all tests
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['real-auth-setup'],
    },
    // Real Supabase auth setup (optional - for integration testing)
    {
      name: 'real-auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Chromium with real Supabase auth
    {
      name: 'chromium-real-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['real-auth-setup'],
    },
    // No-auth tests - for visual checks, deployment verification
    {
      name: 'no-auth',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /.*visual-check\.spec\.ts/,
    },
  ],

  /* Assumes dev server is already running on localhost:3333 */
  /* Run: npm run dev -- -p 3333 in another terminal before running tests */
})





