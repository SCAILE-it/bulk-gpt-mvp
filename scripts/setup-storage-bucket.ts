/**
 * Script to create Supabase storage bucket and policies programmatically
 * Run with: npx tsx scripts/setup-storage-bucket.ts
 */

import { supabaseAdmin } from '../lib/supabase'

const BUCKET_NAME = 'context-files'

async function createStorageBucket() {
  console.log('🚀 Setting up Supabase Storage bucket...\n')

  try {
    // Check if bucket already exists
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
        throw new Error(`Failed to create bucket: ${error.message}`)
      }

      console.log(`✅ Bucket "${BUCKET_NAME}" created successfully!`)
    }

    console.log('\n📋 Next steps:')
    console.log('1. Run the storage policies migration:')
    console.log('   supabase/migrations/004_create_storage_policies.sql')
    console.log('\n2. Or run via Supabase CLI:')
    console.log('   supabase db push')
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

