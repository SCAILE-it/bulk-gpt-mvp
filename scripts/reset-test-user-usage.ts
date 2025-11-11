import { supabaseAdmin } from '../lib/supabase'

const TEST_USER_ID = '2b1c7015-17db-4486-a645-34fe30b5d8b3'

async function resetUsage() {
  console.log('Resetting usage for test user:', TEST_USER_ID)

  const { data, error } = await supabaseAdmin
    .from('user_usage')
    .update({
      batches_created_today: 0,
      rows_processed_today: 0
    })
    .eq('user_id', TEST_USER_ID)
    .select()

  if (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } else {
    console.log('✅ Usage reset successfully!')
    console.log('Data:', data)
  }
}

resetUsage()
