/**
 * Delete stuck batches for test@example.com
 * Run with: npx tsx scripts/delete-stuck-batches.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deleteStuckBatches() {
  console.log('🗑️  Deleting stuck batches for test@example.com...\n')

  // Get test user
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const testUser = users.find(u => u.email === 'test@example.com')

  if (!testUser) {
    console.log('❌ test@example.com not found')
    return
  }

  const userId = testUser.id
  console.log('✅ Found user:', userId)

  // Delete all pending/processing batches
  const { error } = await supabase
    .from('batches')
    .delete()
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])

  if (error) {
    console.error('❌ Error:', error.message)
  } else {
    console.log('✅ Deleted all stuck batches')
  }

  console.log('\n✅ Done! User should be able to create new batches now.')
}

deleteStuckBatches().catch(console.error)
