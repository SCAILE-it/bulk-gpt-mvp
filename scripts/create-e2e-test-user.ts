import { supabaseAdmin } from '../lib/supabase'

const timestamp = Date.now()
const E2E_TEST_USER = {
  email: `e2e-test-${timestamp}@bulkgpt.local`,
  password: 'E2ETest123456!',
  userData: {
    full_name: 'E2E Test User',
    role: 'test_user'
  }
}

async function createE2ETestUser() {
  console.log('Creating E2E test user...')
  console.log('Email:', E2E_TEST_USER.email)

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: E2E_TEST_USER.email,
    password: E2E_TEST_USER.password,
    email_confirm: true,
    user_metadata: E2E_TEST_USER.userData
  })

  if (authError) {
    console.error('❌ Error creating user:', authError)
    process.exit(1)
  }

  console.log('✅ User created successfully!')
  console.log('User ID:', authData.user.id)
  console.log('Email:', authData.user.email)
  console.log('\nCredentials for Playwright test:')
  console.log(`  email: '${E2E_TEST_USER.email}'`)
  console.log(`  password: '${E2E_TEST_USER.password}'`)
}

createE2ETestUser()
