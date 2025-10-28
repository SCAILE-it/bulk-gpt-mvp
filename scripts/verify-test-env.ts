/**
 * ABOUTME: Pre-flight checks for Playwright E2E test environment
 * ABOUTME: Verifies dev server, environment variables, and test user before running tests
 *
 * Usage:
 *   npx tsx scripts/verify-test-env.ts
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

import { createClient } from '@supabase/supabase-js'

interface CheckResult {
  name: string
  passed: boolean
  message: string
  fix?: string
}

const REQUIRED_ENV_VARS = {
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase project URL',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key (for admin operations)',
} as const

const TEST_USER = {
  email: 'test@bulkgpt.local',
  password: 'Test123456!',
}

const DEV_SERVER_PORT = 3334
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`

/**
 * Check if dev server is running on the correct port
 */
async function checkDevServer(): Promise<CheckResult> {
  try {
    const response = await fetch(DEV_SERVER_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    })

    if (response.ok || response.status === 307 || response.status === 401) {
      return {
        name: 'Dev Server',
        passed: true,
        message: `✅ Dev server is running on port ${DEV_SERVER_PORT}`,
      }
    }

    return {
      name: 'Dev Server',
      passed: false,
      message: `❌ Dev server responded with unexpected status: ${response.status}`,
      fix: `Run: npm run dev -- -p ${DEV_SERVER_PORT}`,
    }
  } catch (error) {
    return {
      name: 'Dev Server',
      passed: false,
      message: `❌ Dev server is not running on port ${DEV_SERVER_PORT}`,
      fix: `Run: npm run dev -- -p ${DEV_SERVER_PORT}`,
    }
  }
}

/**
 * Check if required environment variables are set
 */
function checkEnvironmentVariables(): CheckResult {
  const missing: string[] = []

  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[key]) {
      missing.push(`${key} (${description})`)
    }
  }

  if (missing.length === 0) {
    return {
      name: 'Environment Variables',
      passed: true,
      message: '✅ All required environment variables are set',
    }
  }

  return {
    name: 'Environment Variables',
    passed: false,
    message: `❌ Missing environment variables:\n  ${missing.join('\n  ')}`,
    fix: 'Copy .env.local.example to .env.local and fill in the values',
  }
}

/**
 * Check if test user exists in Supabase
 */
async function checkTestUser(): Promise<CheckResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // If env vars aren't set, we already failed that check
  if (!supabaseUrl || !serviceKey) {
    return {
      name: 'Test User',
      passed: false,
      message: '⚠️ Skipped (environment variables not set)',
    }
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      return {
        name: 'Test User',
        passed: false,
        message: `❌ Failed to query Supabase users: ${error.message}`,
        fix: 'Check your SUPABASE_SERVICE_ROLE_KEY is correct',
      }
    }

    const testUserExists = data?.users?.some(
      (user) => user.email === TEST_USER.email
    )

    if (testUserExists) {
      return {
        name: 'Test User',
        passed: true,
        message: `✅ Test user exists (${TEST_USER.email})`,
      }
    }

    return {
      name: 'Test User',
      passed: false,
      message: `❌ Test user does not exist (${TEST_USER.email})`,
      fix: 'Run: npx tsx scripts/create-test-user.ts',
    }
  } catch (error) {
    return {
      name: 'Test User',
      passed: false,
      message: `❌ Error checking test user: ${error instanceof Error ? error.message : String(error)}`,
      fix: 'Check Supabase connection and credentials',
    }
  }
}

/**
 * Run all pre-flight checks
 */
async function runChecks(): Promise<void> {
  console.log('🔍 Running pre-flight checks for Playwright E2E tests...\n')

  const checks: CheckResult[] = []

  // Run checks in sequence (some depend on earlier ones)
  checks.push(checkEnvironmentVariables())
  checks.push(await checkDevServer())
  checks.push(await checkTestUser())

  // Print results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  for (const check of checks) {
    console.log(check.message)
    if (!check.passed && check.fix) {
      console.log(`  Fix: ${check.fix}`)
    }
    console.log('')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Summary
  const passedCount = checks.filter((c) => c.passed).length
  const totalCount = checks.length
  const allPassed = passedCount === totalCount

  if (allPassed) {
    console.log(`✅ All checks passed (${passedCount}/${totalCount})`)
    console.log('Ready to run Playwright tests!\n')
    process.exit(0)
  } else {
    console.log(`❌ ${totalCount - passedCount} check(s) failed (${passedCount}/${totalCount} passed)`)
    console.log('Fix the issues above before running tests.\n')
    console.log('📚 For more information, see docs/TESTING.md\n')
    process.exit(1)
  }
}

// Run checks
runChecks().catch((error) => {
  console.error('❌ Unexpected error during pre-flight checks:')
  console.error(error)
  process.exit(1)
})
