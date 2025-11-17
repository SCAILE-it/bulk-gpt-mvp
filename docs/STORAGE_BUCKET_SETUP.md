# Storage Bucket Setup Guide

## Option 1: Using Script (Requires Service Role Key)

The script `scripts/setup-storage-bucket.js` can create the bucket automatically, but you need to add your Supabase Service Role Key first.

### Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Find **`service_role`** key (NOT the `anon` key)
3. Copy it

### Step 2: Add to .env.local

Add this line to your `.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

⚠️ **Important**: Never commit this key to git! It has admin access.

### Step 3: Run the Script

```bash
node scripts/setup-storage-bucket.js
```

## Option 2: Manual Setup (Dashboard)

### Step 1: Create Bucket

1. Go to **Supabase Dashboard** → **Storage** → **Buckets**
2. Click **New bucket**
3. Configure:
   - **Name**: `context-files`
   - **Public bucket**: ❌ Unchecked (private)
   - **File size limit**: `10MB`
   - **Allowed MIME types**: Leave empty or add CSV/XLSX/PDF/DOCX types
4. Click **Create bucket**

### Step 2: Add RLS Policies

Run the migration `supabase/migrations/004_create_storage_policies.sql` in Supabase SQL Editor.

## Option 3: Using Supabase CLI

If you have Supabase CLI linked to your project:

```bash
# Create bucket via CLI (if supported)
supabase storage create context-files --private
```

Then run the policies migration.

## Verification

After setup, test by:

1. Going to **Context → Files** tab in your app
2. Uploading a test file
3. Verifying it appears in Supabase Storage under `context-files/{userId}/`

## Security Notes

- ✅ Bucket is private (not public)
- ✅ RLS policies ensure users only access their own files
- ✅ Files stored in user-specific folders: `context-files/{userId}/`
- ✅ Service role key only used server-side (never exposed to client)

