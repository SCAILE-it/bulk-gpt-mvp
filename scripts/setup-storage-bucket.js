/**
 * Script to create Supabase storage bucket programmatically
 * Run with: node scripts/setup-storage-bucket.js
 * 
 * Requires environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const BUCKET_NAME = 'context-files'

async function createStorageBucket() {
  console.log('🚀 Setting up Supabase Storage bucket...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!')
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    console.error('   Make sure .env.local exists and contains these variables')
    console.error(`   Found NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}`)
    console.error(`   Found SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅' : '❌'}`)
    console.error('\n   Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '))
    process.exit(1)
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Check if bucket already exists
    console.log('📋 Checking existing buckets...')
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`)
    }

    const bucketExists = existingBuckets?.some(bucket => bucket.name === BUCKET_NAME)

    if (bucketExists) {
      console.log(`✅ Bucket "${BUCKET_NAME}" already exists, skipping creation`)
    } else {
      // Create the bucket
      console.log(`📦 Creating bucket "${BUCKET_NAME}"...`)
      const { data, error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: false, // Private bucket
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      })

      if (error) {
        // Check if it's a "bucket already exists" error (which is fine)
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          console.log(`✅ Bucket "${BUCKET_NAME}" already exists (detected via error message)`)
        } else {
          throw new Error(`Failed to create bucket: ${error.message}`)
        }
      } else {
        console.log(`✅ Bucket "${BUCKET_NAME}" created successfully!`)
      }
    }

    console.log('\n📋 Next steps:')
    console.log('1. Run the storage policies migration:')
    console.log('   supabase/migrations/004_create_storage_policies.sql')
    console.log('\n2. Or run via Supabase SQL Editor in Dashboard')
    console.log('\n✅ Storage bucket setup complete!')

  } catch (error) {
    console.error('❌ Error setting up storage bucket:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

// Run the script
createStorageBucket()

