/**
 * Test script for integrations
 * Run with: node scripts/test-integrations.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testIntegrations() {
  console.log('🧪 Testing Integrations Setup...\n')

  // Test 1: Check encryption key exists
  console.log('1. Checking encryption key...')
  const { data: keys, error: keyError } = await supabaseAdmin
    .from('pgsodium.key')
    .select('id, name')
    .eq('name', 'integrations_api_key_encryption')
    .limit(1)

  if (keyError) {
    console.log('   ⚠️  Could not check key (might need direct SQL query)')
  } else if (keys && keys.length > 0) {
    console.log('   ✅ Encryption key exists')
  } else {
    console.log('   ❌ Encryption key not found')
  }

  // Test 2: Check integrations table exists
  console.log('\n2. Checking integrations table...')
  const { data: integrations, error: tableError } = await supabaseAdmin
    .from('integrations')
    .select('id')
    .limit(1)

  if (tableError) {
    console.log('   ❌ Table error:', tableError.message)
  } else {
    console.log('   ✅ Integrations table exists')
  }

  // Test 3: Test encryption function (if accessible)
  console.log('\n3. Testing encryption function...')
  try {
    const { data: encrypted, error: encryptError } = await supabaseAdmin.rpc('encrypt_api_key', {
      api_key: 'test-key-123'
    })
    
    if (encryptError) {
      console.log('   ⚠️  Encryption test:', encryptError.message)
    } else if (encrypted) {
      console.log('   ✅ Encryption function works')
      
      // Test decryption
      const { data: decrypted, error: decryptError } = await supabaseAdmin.rpc('decrypt_api_key', {
        encrypted_key: encrypted
      })
      
      if (decryptError) {
        console.log('   ⚠️  Decryption test:', decryptError.message)
      } else if (decrypted === 'test-key-123') {
        console.log('   ✅ Decryption function works')
      } else {
        console.log('   ⚠️  Decryption returned different value')
      }
    }
  } catch (error) {
    console.log('   ⚠️  Could not test encryption (might need authenticated user)')
  }

  // Test 4: Check storage bucket
  console.log('\n4. Checking storage bucket...')
  const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets()
  
  if (bucketError) {
    console.log('   ⚠️  Could not list buckets:', bucketError.message)
  } else {
    const contextFilesBucket = buckets?.find(b => b.name === 'context-files')
    if (contextFilesBucket) {
      console.log('   ✅ context-files bucket exists')
      console.log(`      Public: ${contextFilesBucket.public ? 'Yes' : 'No'} (should be No)`)
      console.log(`      Size limit: ${contextFilesBucket.file_size_limit ? contextFilesBucket.file_size_limit / 1024 / 1024 + 'MB' : 'Not set'}`)
    } else {
      console.log('   ❌ context-files bucket not found')
    }
  }

  // Test 5: Check storage policies
  console.log('\n5. Checking storage policies...')
  console.log('   💡 Run this SQL to verify policies:')
  console.log('   SELECT policyname FROM pg_policies WHERE schemaname = \'storage\' AND tablename = \'objects\';')

  console.log('\n✅ Integration setup verification complete!')
  console.log('\n📋 Next: Test via UI at Context → Integrations tab')
}

testIntegrations().catch(console.error)

