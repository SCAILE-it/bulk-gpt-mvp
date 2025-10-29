/**
 * Test batch creation in production after trigger fix
 * Run with: npx tsx scripts/test-batch-creation.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testBatchCreation() {
  console.log('🧪 Testing batch creation after trigger fix...\n')

  // Get test user
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const testUser = users.find(u => u.email === 'test@example.com')

  if (!testUser) {
    console.log('❌ test@example.com not found')
    return
  }

  const userId = testUser.id
  console.log('✅ Found user:', userId)

  // Try to create a test batch
  const testBatchId = `batch_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  console.log('\n📝 Attempting to create test batch:', testBatchId)

  const { data, error } = await supabase
    .from('batches')
    .insert({
      id: testBatchId,
      user_id: userId,
      csv_filename: 'test.csv',
      total_rows: 3,
      status: 'pending',
      prompt: 'Test batch creation after trigger fix',
    })
    .select()

  if (error) {
    console.error('❌ Batch creation FAILED:')
    console.error('   Error:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error.details)
    console.log('\n⚠️  The trigger may still be active or there is another issue.')
  } else {
    console.log('✅ Batch created successfully!')
    console.log('   Batch ID:', data[0].id)
    console.log('   Status:', data[0].status)
    console.log('   Rows:', data[0].total_rows)

    // Clean up - delete the test batch
    console.log('\n🧹 Cleaning up test batch...')
    const { error: deleteError } = await supabase
      .from('batches')
      .delete()
      .eq('id', testBatchId)

    if (deleteError) {
      console.log('   ⚠️  Could not delete test batch:', deleteError.message)
    } else {
      console.log('   ✅ Test batch deleted')
    }
  }

  console.log('\n' + (error ? '❌ TEST FAILED' : '✅ TEST PASSED'))
  console.log(error
    ? 'Batch creation is still broken. The trigger may not have been dropped.'
    : 'Batch creation is working! Users can now send batches.')
}

testBatchCreation().catch(console.error)
