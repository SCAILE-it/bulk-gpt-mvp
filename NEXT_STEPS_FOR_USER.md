# Next Steps: RLS Policy Investigation

**Summary**: I've created comprehensive investigation and fix plan documents. Now we need to check the Supabase RLS policies to confirm root cause.

## Documents Created

1. ✅ **PRODUCTION_BATCH_FAILURE_INVESTIGATION.md** - Complete investigation summary
2. ✅ **FIX_PLAN.md** - Detailed fix plan with multiple options and migration SQL

## What You Need to Do Now

### Option 1: Check RLS Policies via Supabase Dashboard (EASIEST)

1. Navigate to: https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn
2. Go to: **Database** → **Tables** → `batches`
3. Click the **"RLS"** or **"Policies"** tab
4. Take a screenshot or copy the policy names and definitions
5. Repeat for `batch_results` table

**Look for**:
- Is RLS enabled? (toggle at top)
- Are there policies like:
  - `(auth.uid() = user_id)` ← This would block service role
  - `(auth.role() = 'authenticated')` ← This would also block
- Are there separate policies for `service_role`?

### Option 2: Check via SQL Editor (IN DASHBOARD)

1. Go to: **SQL Editor** in Supabase dashboard
2. Run this query:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('batches', 'batch_results');

-- Check existing policies
SELECT
  tablename,
  policyname,
  cmd as operation,
  roles,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename IN ('batches', 'batch_results')
ORDER BY tablename, policyname;
```

3. Screenshot the results

### Option 3: Use psql (IF YOU HAVE ACCESS)

```bash
# Connect to production database
psql "postgresql://postgres:[PASSWORD]@db.ayjpnfzbxhcwwxvobssn.supabase.co:5432/postgres"

# Run same queries as Option 2
```

## What To Tell Me

After checking, respond with:

**If RLS is enabled**:
- "RLS is enabled on batches and batch_results"
- Copy-paste the policy definitions

**If RLS is NOT enabled**:
- "RLS is disabled"
- Then we'll investigate other causes (transaction timing, etc.)

## Expected Outcome

**Most Likely**: RLS is enabled with a policy like:
```sql
CREATE POLICY "users_select_own_batches"
ON batches FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

This would prevent Modal's service role from seeing user-created batches, causing the FK error.

## What Happens Next

Once you confirm RLS policies, I'll:
1. Create the migration file to fix the issue
2. Test locally if possible
3. Apply to production
4. Verify with Playwright test

**Estimated fix time after confirmation**: 30 minutes

---

## Alternative: If You Want Me to Proceed Without Confirmation

If you trust my hypothesis and want me to create the fix now:

1. I'll create a migration file that:
   - Adds service_role exceptions to RLS policies
   - Preserves user data isolation
   - Fixes the FK constraint issue

2. You'll need to review and apply it manually via:
   - Supabase dashboard SQL editor
   - OR `supabase db push` (if we can get CLI working)

**Let me know which approach you prefer!**

---

## Quick Reference

**Supabase Project**: https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn
**Project Ref**: `ayjpnfzbxhcwwxvobssn`
**Tables to check**: `batches`, `batch_results`
**What to look for**: RLS policies that use `auth.uid()` or `auth.role()`

**Related docs**:
- Investigation summary: `PRODUCTION_BATCH_FAILURE_INVESTIGATION.md`
- Fix plan with migration SQL: `FIX_PLAN.md`
