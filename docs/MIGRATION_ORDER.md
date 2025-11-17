# Integration Migrations - Run Order

## Required Migrations (Run in Order)

You need to run **3 migrations** in this exact order:

### 1. `001_create_integrations.sql` ⭐ **MUST RUN FIRST**
   - Creates `integrations` table
   - Enables pgsodium extension
   - Creates encryption key (`integrations_api_key_encryption`)
   - Creates `encrypt_api_key()` and `decrypt_api_key()` functions
   - Sets up RLS policies

### 2. `002_create_integration_syncs.sql` ⭐ **RUN SECOND**
   - Creates `integration_syncs` table
   - Tracks sync operations (read/write/full)
   - **Depends on**: `integrations` table (foreign key)

### 3. `003_create_integration_data.sql` ⭐ **RUN THIRD**
   - Creates `integration_data` table
   - Stores cached data from integrations
   - **Depends on**: `integrations` table (foreign key)

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file **one at a time**, in order:
   - Copy contents of `001_create_integrations.sql` → Run
   - Copy contents of `002_create_integration_syncs.sql` → Run
   - Copy contents of `003_create_integration_data.sql` → Run

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
# This will run all migrations in order automatically
```

### Option 3: Manual SQL Execution
Run each file's SQL content in Supabase SQL Editor, in order.

## Verification

After running all 3 migrations, verify:

```sql
-- Check integrations table exists
SELECT * FROM integrations LIMIT 1;

-- Check encryption key exists
SELECT id, name FROM pgsodium.key WHERE name = 'integrations_api_key_encryption';

-- Check encryption function works
SELECT encrypt_api_key('test-key');

-- Check syncs table exists
SELECT * FROM integration_syncs LIMIT 1;

-- Check data table exists
SELECT * FROM integration_data LIMIT 1;
```

## Important Notes

⚠️ **Order matters!** Migration 002 and 003 depend on migration 001.

⚠️ **If migration fails**: Check error message - might be because:
- Previous migration not run
- Tables already exist (use `CREATE TABLE IF NOT EXISTS` - safe to re-run)
- pgsodium extension not available (contact Supabase support)

✅ **Safe to re-run**: All migrations use `IF NOT EXISTS` clauses, so safe to run multiple times.

