/**
 * Script to create second test user for manual testing
 * Run with: npx tsx scripts/create-test-user-2.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Second test user credentials
const TEST_USER_2 = {
  email: 'test2@bulkgpt.local',
  password: 'Test123456!',
  userData: {
    full_name: 'Test User 2',
    role: 'test_user'
  }
}

async function createTestUser2() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    console.error('Make sure .env.local is set up correctly')
    process.exit(1)
  }

  console.log('🔧 Creating Supabase admin client...')
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log(`\n📧 Creating test user: ${TEST_USER_2.email}`)

  try {
    // First check if user already exists
    const { data: existing } = await supabase.auth.admin.listUsers()
    const existingUser = existing?.users.find((u: any) => u.email === TEST_USER_2.email)

    if (existingUser) {
      console.log('✅ Test user already exists')
      console.log(`   User ID: ${existingUser.id}`)
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Created: ${existingUser.created_at}`)
      console.log(`\n📝 Test credentials:`)
      console.log(`   Email: ${TEST_USER_2.email}`)
      console.log(`   Password: ${TEST_USER_2.password}`)
      return
    }

    // Create the user
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_USER_2.email,
      password: TEST_USER_2.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: TEST_USER_2.userData
    })

    if (error) {
      console.error('❌ Error creating user:', error.message)
      process.exit(1)
    }

    console.log('\n✅ Test user created successfully!')
    console.log(`   User ID: ${data.user.id}`)
    console.log(`   Email: ${data.user.email}`)
    console.log(`\n📝 Test credentials for manual testing:`)
    console.log(`   Email: ${TEST_USER_2.email}`)
    console.log(`   Password: ${TEST_USER_2.password}`)
    console.log(`\n💡 You can now login with these credentials at:`)
    console.log(`   https://bulk-gpt-app.vercel.app`)

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

createTestUser2()
