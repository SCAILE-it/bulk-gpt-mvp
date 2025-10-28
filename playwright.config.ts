import { defineConfig, devices } from '@playwright/test'

/**
 * ABOUTME: Playwright E2E test configuration for bulk-gpt-app
 * ABOUTME: Configures automated testing with real Supabase authentication and isolated test environment
 *
 * Key features:
 * - Runs on port 3334 (isolated from dev server on 3333)
 * - Uses real Supabase auth with test@bulkgpt.local
 * - Automated pre-flight checks (verify-test-env.ts)
 * - Automated dev server setup (start-test-server.sh)
 *
 * Quick start:
 *   npm run test:setup   # Creates test user, starts server, validates environment
 *   npm run test:e2e     # Runs all E2E tests with pre-flight checks
 *   npm run test:cleanup # Stops server, cleans up artifacts
 *
 * See docs/TESTING.md for full documentation
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
    /*
     * Base URL: Port 3334 isolates tests from dev server (port 3333)
     * Automatically started by: npm run test:server (bash scripts/start-test-server.sh)
     */
    baseURL: 'http://localhost:3334',

    /* Collect trace when retrying failed tests for debugging */
    trace: 'on-first-retry',

    /*
     * Vercel deployment protection bypass for production E2E tests
     * Set VERCEL_BYPASS_TOKEN in .env.local if testing against Vercel deployments
     */
    extraHTTPHeaders: process.env.VERCEL_BYPASS_TOKEN ? {
      'x-vercel-protection-bypass': process.env.VERCEL_BYPASS_TOKEN,
    } : {},
  },

  /* Configure projects for major browsers */
  projects: [
    /*
     * Main test project - uses real Supabase authentication
     * Credentials: test@bulkgpt.local / Test123456!
     * Auth session saved to: playwright/.auth/user.json (created by auth.setup.ts)
     *
     * Dependencies:
     * - Requires 'real-auth-setup' to run first (creates auth session)
     * - Requires dev server on port 3334 (started by npm run test:server)
     * - Requires test user in Supabase (created by npm run test:user)
     */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved authenticated session for all tests
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['real-auth-setup'],
    },

    /*
     * Authentication setup project - runs before main tests
     * Creates authenticated session using real Supabase email/password login
     * Saves session to playwright/.auth/user.json for test reuse
     *
     * Important: This is NOT a mock - it uses real Supabase auth API
     * Test user must exist in Supabase (created by scripts/create-test-user.ts)
     */
    {
      name: 'real-auth-setup',
      testMatch: /auth\.setup\.ts/,
    },

    /*
     * Alternative Chromium project with explicit auth dependency
     * Functionally identical to 'chromium' project above
     * Kept for backward compatibility with existing tests
     */
    {
      name: 'chromium-real-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['real-auth-setup'],
    },

    /*
     * No-auth project for tests that don't require authentication
     * Use cases:
     * - Visual regression tests on public pages
     * - Deployment verification (check if site is up)
     * - Testing auth flows themselves (login, signup, etc.)
     */
    {
      name: 'no-auth',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /.*visual-check\.spec\.ts/,
    },
  ],

  /*
   * Dev server is managed by test automation scripts:
   * - npm run test:server  -> Starts dev server on port 3334 automatically
   * - npm run test:cleanup -> Stops server and cleans up artifacts
   *
   * Port 3334 chosen to avoid conflicts with default dev server (port 3333)
   * See scripts/start-test-server.sh for implementation details
   */
})





