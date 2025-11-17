# Supabase Storage Setup for Context Files

This guide explains how to set up the Supabase storage bucket for context file uploads.

## Prerequisites

- Supabase project created
- Supabase URL and keys configured in environment variables

## Steps

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New bucket**
4. Configure:
   - **Name**: `context-files`
   - **Public bucket**: Unchecked (private)
   - **File size limit**: 10MB (or as needed)
   - **Allowed MIME types**: Leave empty or specify:
     - `text/csv`
     - `application/vnd.ms-excel`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### 2. Set Up Row Level Security (RLS) Policies

Navigate to **Storage** → **Policies** → `context-files` bucket

#### Policy 1: Users can upload files to their own folder

```sql
-- Policy name: Users can upload to own folder
-- Operation: INSERT
-- Target roles: authenticated

(user_id()::text = (storage.foldername(name))[1])
```

#### Policy 2: Users can read their own files

```sql
-- Policy name: Users can read own files
-- Operation: SELECT
-- Target roles: authenticated

(user_id()::text = (storage.foldername(name))[1])
```

#### Policy 3: Users can delete their own files

```sql
-- Policy name: Users can delete own files
-- Operation: DELETE
-- Target roles: authenticated

(user_id()::text = (storage.foldername(name))[1])
```

#### Policy 4: Users can list files in their own folder

```sql
-- Policy name: Users can list own folder
-- Operation: SELECT
-- Target roles: authenticated

(user_id()::text = (storage.foldername(name))[1])
```

### 3. Verify Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Test the Setup

1. Upload a file via the Context → Files tab
2. Verify the file appears in Supabase Storage under `context-files/{userId}/`
3. Try deleting the file
4. Verify it's removed from storage

## File Structure

Files are stored with the following structure:
```
context-files/
  {userId}/
    {timestamp}-{filename}
```

Example:
```
context-files/
  123e4567-e89b-12d3-a456-426614174000/
    1704067200000-product-catalog.xlsx
    1704067300000-company-profile.pdf
```

## API Endpoints

- `POST /api/context-files/upload` - Upload a file
- `GET /api/context-files` - List user's files
- `DELETE /api/context-files` - Delete a file

## Security Notes

- Files are stored in user-specific folders
- RLS policies ensure users can only access their own files
- File size limit enforced (10MB default)
- File type validation on upload
- Service role key only used server-side

