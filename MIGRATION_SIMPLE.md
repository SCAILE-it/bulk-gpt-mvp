# Single Unified Migration

## ✅ One Migration File

**File:** `supabase/migrations/20250116000000_unified_business_contexts.sql`

This single migration consolidates everything:
- Creates `business_contexts` table (if doesn't exist)
- Adds all business context fields (ICP, countries, products, keywords)
- Adds all context variable fields (tone, product description, etc.)
- Adds all GTM classification fields (playbook, product type, AI tracking)
- Sets up indexes, RLS policies, and triggers

## 🚀 How to Run

### Option 1: Supabase Dashboard (Easiest)
1. Go to **Database** → **SQL Editor**
2. Copy the entire contents of `20250116000000_unified_business_contexts.sql`
3. Paste and click **"Run"**
4. Done! ✅

### Option 2: Supabase CLI
```bash
# If not linked
supabase link --project-ref YOUR_PROJECT_REF

# Push migration
supabase db push
```

## 🔍 Verify It Worked

Run this in Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_contexts' 
ORDER BY column_name;
```

**Expected:** ~22 columns including:
- `icp`, `countries`, `products`, `target_keywords`, `competitor_keywords`
- `tone`, `target_countries`, `product_description`, `competitors`, `target_industries`, `compliance_flags`
- `gtm_playbook`, `product_type`, and all AI tracking fields

## ✅ Notes

- **Idempotent:** Safe to run multiple times (won't break if columns already exist)
- **Consolidates:** Replaces the need for 4 separate migrations
- **Backward compatible:** Works even if some columns already exist


