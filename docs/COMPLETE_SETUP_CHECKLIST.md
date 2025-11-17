# Complete Setup Checklist

## ✅ Database Migrations (SQL - Already Done)

You've already run these 3 migrations:
- ✅ `001_create_integrations.sql` - Creates integrations table + encryption
- ✅ `002_create_integration_syncs.sql` - Creates sync tracking table
- ✅ `003_create_integration_data.sql` - Creates data cache table

## ⚠️ Storage Bucket Setup (Manual - Dashboard Only)

Storage buckets **cannot** be created via SQL migrations. They must be set up manually in the Supabase Dashboard.

### Step 1: Create Storage Bucket

1. Go to **Supabase Dashboard** → **Storage** → **Buckets**
2. Click **New bucket**
3. Configure:
   - **Name**: `context-files` (exact name - used in code)
   - **Public bucket**: ❌ **Unchecked** (must be private)
   - **File size limit**: `10MB` (or adjust as needed)
   - **Allowed MIME types**: Leave empty (or specify CSV/XLSX/PDF/DOCX types)

4. Click **Create bucket**

### Step 2: Set Up Storage RLS Policies

After creating the bucket, you need to add RLS policies. You can do this via SQL:

**Go to Supabase Dashboard → Storage → Policies → `context-files` bucket**

Then run this SQL in the SQL Editor:

```sql
-- Policy 1: Users can upload files to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'context-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can read their own files
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'context-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'context-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can list files in their own folder
CREATE POLICY "Users can list own folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'context-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**OR** you can add these policies via the Dashboard UI:
1. Go to **Storage** → **Policies** → `context-files` bucket
2. Click **New Policy**
3. For each policy, select:
   - **Operation**: INSERT / SELECT / DELETE
   - **Target roles**: `authenticated`
   - **Policy definition**: Use the SQL conditions above

## 📋 Complete Setup Summary

### ✅ Completed (SQL Migrations)
- [x] `001_create_integrations.sql` - Integrations table + encryption
- [x] `002_create_integration_syncs.sql` - Sync tracking
- [x] `003_create_integration_data.sql` - Data cache

### ⚠️ Still Needed (Manual Setup)
- [ ] Create `context-files` storage bucket in Dashboard
- [ ] Add RLS policies for storage bucket (via SQL or Dashboard UI)

### ✅ Already Configured (Code)
- [x] API routes for file upload/download/delete
- [x] React hooks for file management
- [x] UI components for file upload
- [x] Environment variables (should already be set)

## 🧪 Testing

After completing storage setup:

1. **Test File Upload**:
   - Go to Context → Files tab
   - Upload a test CSV/XLSX/PDF/DOCX file
   - Verify it appears in Supabase Storage under `context-files/{userId}/`

2. **Test File List**:
   - Refresh the page
   - Verify uploaded files appear in the list

3. **Test File Delete**:
   - Click delete on a test file
   - Verify it's removed from storage

## 📝 Notes

- **Storage buckets** = Dashboard UI only (no SQL migration)
- **RLS policies** = Can be done via SQL or Dashboard UI
- **Database tables** = SQL migrations (already done ✅)
- **File structure**: `context-files/{userId}/{timestamp}-{filename}`

## 🔗 Related Documentation

- `docs/SUPABASE_STORAGE_SETUP.md` - Detailed storage setup guide
- `docs/ENCRYPTION_SETUP.md` - Encryption setup details
- `docs/MIGRATION_ORDER.md` - Migration order reference

