# Migration Checklist for Unified Context Form

## ✅ Required Migrations

Make sure these migrations have been run in Supabase (in order):

1. **`20250115000001_create_business_contexts.sql`** ✅
   - Creates the `business_contexts` table
   - Adds: `icp`, `countries`, `products`, `target_keywords`, `competitor_keywords`

2. **`20250116000000_add_gtm_fields_to_business_contexts.sql`** ✅
   - Adds GTM classification fields
   - Adds: `gtm_playbook`, `product_type`, AI tracking fields, confidence scores

3. **`20250116000002_add_context_variables_to_business_contexts.sql`** ✅
   - Adds context variable fields
   - Adds: `tone`, `target_countries`, `product_description`, `competitors`, `target_industries`, `compliance_flags`

4. **`20250116000004_verify_business_contexts_schema.sql`** ✅ (NEW - Safety check)
   - Verifies all required columns exist
   - Idempotent - safe to run multiple times

## 🔍 How to Check if Migrations Are Applied

### Option 1: Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **Database** → **Migrations**
3. Check if all migrations listed above show as "Applied"

### Option 2: SQL Query
Run this in Supabase SQL Editor to check which columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_contexts' 
ORDER BY column_name;
```

**Expected columns:**
- `icp` (TEXT)
- `countries` (ARRAY)
- `products` (ARRAY)
- `target_keywords` (ARRAY)
- `competitor_keywords` (ARRAY)
- `tone` (TEXT)
- `target_countries` (TEXT)
- `product_description` (TEXT)
- `competitors` (TEXT)
- `target_industries` (TEXT)
- `compliance_flags` (TEXT)
- `gtm_playbook` (TEXT)
- `product_type` (TEXT)
- `gtm_playbook_ai_suggested` (BOOLEAN)
- `product_type_ai_suggested` (BOOLEAN)
- `gtm_playbook_confidence` (DECIMAL)
- `product_type_confidence` (DECIMAL)
- `gtm_playbook_manually_overridden` (BOOLEAN)
- `product_type_manually_overridden` (BOOLEAN)
- `gtm_playbook_ai_suggestion` (TEXT)
- `product_type_ai_suggestion` (TEXT)
- `migration_banner_shown` (BOOLEAN)

## 🚀 How to Run Migrations

### Via Supabase Dashboard (Recommended)
1. Go to **Database** → **Migrations**
2. Click **"New Migration"**
3. Copy and paste the SQL from each migration file
4. Click **"Run Migration"**

### Via Supabase CLI
```bash
# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## ✅ Verification

After running migrations, verify everything works:

1. **Test the unified form:**
   - Go to Context → Business Context tab
   - Fill in ICP, countries, products
   - Check that auto-save works

2. **Test GTM classification:**
   - Fill in ICP and products
   - Check if GTM auto-classifies
   - Or click "Analyse" button

3. **Check database:**
   - Verify data is saved in `business_contexts` table
   - Check that all fields are populated correctly

## 📝 Notes

- All migrations are **idempotent** (safe to run multiple times)
- The `20250116000004_verify_business_contexts_schema.sql` migration is a safety check
- If migrations were already run, this verification migration will do nothing
- The unified form uses `countries` (TEXT[]) as the primary field
- `target_countries` (TEXT) remains for backward compatibility but isn't used by the new form

