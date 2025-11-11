# Production Fix: "Usage limit check failed" Error - Action Plan

**Date**: November 3, 2025
**Issue**: `/api/process` endpoint failing with "Usage limit check failed" error
**Supabase Project**: `ayjpnfzbxhcwwxvobssn`
**Vercel Project**: `bulk-gpt-app` (ID: `prj_5yZ1D9vd3jDjOsR6buu0k3VoYcGP`)

---

## Investigation Summary

### ✅ What We Know

1. **Fix Already Committed** (Commit `82af874`)
   - **When**: November 3, 2025 at 22:17:29 UTC
   - **What**: Fixed type mismatch in `checkUsageLimits()` function
   - **Status**: ✅ Pushed to origin/main
   - **File**: `lib/api-keys.ts:186-233`

2. **Root Cause of Original Bug**
   - The Supabase RPC function `check_usage_limits` returns a TABLE (array)
   - Code was incorrectly calling `.single()` expecting a single object
   - This caused Supabase PostgREST to throw an error
   - Error was caught and logged as "Usage limit check failed"

3. **The Fix**
   ```typescript
   // OLD (BUGGY - line ~192 before fix)
   .rpc('check_usage_limits', { p_user_id: userId })
   .single() as { data: {...} | null, error: unknown }  // ❌ WRONG!

   // NEW (FIXED - commit 82af874)
   .rpc('check_usage_limits', { p_user_id: userId }) as {
     data: Array<{...}> | null,  // ✅ CORRECT - Array type
     error: unknown
   }
   // Then access: data?.[0]
   ```

4. **Error Timeline**
   - Commit pushed: Nov 3, 22:17:29 UTC
   - Error occurred: Nov 4, 00:08:42 UTC (1 hour 51 minutes AFTER commit)
   - **Conclusion**: Either Vercel didn't redeploy, or database migration is missing

---

## ❓ What We DON'T Know

### Critical Unknown #1: Vercel Deployment Status
- **Question**: Did Vercel redeploy with the fix?
- **Evidence**: No visible auto-deploy mechanism in GitHub
- **Impact**: If not redeployed, production is still running buggy code

### Critical Unknown #2: Database Migration Status
- **Question**: Does production Supabase have the `check_usage_limits` RPC function?
- **Required Migration**: `supabase/migrations/20251029094229_api_keys_and_usage.sql`
- **Impact**: If migration not applied, RPC function doesn't exist → error occurs even with fixed code

---

## 🎯 Action Plan

### PRIORITY 1: Verify Database Migration (Most Likely Issue)

**Why This First**: Even if the code fix is deployed, the error will persist if the database doesn't have the RPC function.

#### Step 1.1: Check if `check_usage_limits` Function Exists

**Via Supabase Dashboard** (Recommended):

1. Go to: https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn
2. Navigate to: **SQL Editor**
3. Run this query:

```sql
-- Check if the function exists
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'check_usage_limits';
```

**Expected Results**:
- ✅ **If function exists**: You'll see the function definition
- ❌ **If function doesn't exist**: Empty result set

#### Step 1.2: If Function Doesn't Exist, Apply Migration

**Via Supabase Dashboard SQL Editor**:

1. Open migration file locally: `supabase/migrations/20251029094229_api_keys_and_usage.sql`
2. Copy the entire contents
3. Paste into Supabase Dashboard → **SQL Editor** → New Query
4. Click **Run**
5. Verify no errors in output

**Via Supabase CLI** (Alternative):

```bash
cd /home/federicodeponte/projects/bulk-gpt-app

# Link to production project (if not already linked)
supabase link --project-ref ayjpnfzbxhcwwxvobssn

# Push migrations to production
supabase db push

# Verify migration applied
supabase migration list
```

#### Step 1.3: Test the Function

After applying migration, test the function:

```sql
-- Test with the actual user ID from the error
SELECT * FROM check_usage_limits('16212508-50d4-43be-bff2-51e4a26e07b4');
```

**Expected Result**:
```
can_process | batches_today | rows_today | daily_batch_limit | daily_row_limit | reason
-----------+---------------+------------+-------------------+-----------------+--------
true        | 0             | 0          | 10                | 1000            | null
```

If you get an error about missing `user_usage` table entry, that's OK - the function should auto-create it.

---

### PRIORITY 2: Verify and Trigger Vercel Deployment

#### Step 2.1: Check Current Deployment

**Via Vercel Dashboard**:

1. Go to: https://vercel.com/team_wiQvuMUtgb9qucGIZRIPuZFo/bulk-gpt-app
2. Click **Deployments**
3. Check the most recent production deployment
4. Look for:
   - **Deployment Date**: Should be Nov 3, 2025 after 22:17 UTC
   - **Git Commit**: Should show `82af874` or later
   - **Status**: Should be "Ready"

**What to Look For**:
- ✅ If commit is `82af874` or later → Deployment is good
- ❌ If commit is older than `82af874` → Need to trigger redeploy

#### Step 2.2: Trigger Redeploy (If Needed)

**Option A: Via Vercel Dashboard** (Easiest):

1. Go to: https://vercel.com/team_wiQvuMUtgb9qucGIZRIPuZFo/bulk-gpt-app
2. Click **Deployments** tab
3. Find the deployment with commit `82af874`
4. Click the **three dots (...)** menu
5. Click **Promote to Production**

**Option B: Via Git Push** (If auto-deploy is configured):

```bash
cd /home/federicodeponte/projects/bulk-gpt-app

# Create empty commit to trigger deploy
git commit --allow-empty -m "chore: trigger Vercel redeploy for usage limit fix"
git push origin main

# Monitor deployment
# Check: https://vercel.com/team_wiQvuMUtgb9qucGIZRIPuZFo/bulk-gpt-app/deployments
```

**Option C: Via Vercel CLI**:

```bash
cd /home/federicodeponte/projects/bulk-gpt-app

# Login (if not already)
vercel login

# Deploy to production
vercel --prod

# Monitor deployment
vercel inspect <deployment-url>
```

---

### PRIORITY 3: Verify Environment Variables

#### Step 3.1: Check Required Variables

Go to: **Vercel Dashboard → Project Settings → Environment Variables**

**Required Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ayjpnfzbxhcwwxvobssn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (starts with eyJ)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (starts with eyJ - MUST be service role, not anon!)
```

**Critical**: `SUPABASE_SERVICE_ROLE_KEY` must be the **service role** key, NOT the anon key.

**How to Get Service Role Key**:
1. Go to: https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn/settings/api
2. Scroll to **Project API keys**
3. Copy the **`service_role`** secret key (starts with `eyJ...`)
4. Paste into Vercel environment variable `SUPABASE_SERVICE_ROLE_KEY`
5. Make sure it's set for **Production**, **Preview**, AND **Development**

---

### PRIORITY 4: Test Production Endpoint

After completing steps 1-3, test the production endpoint:

#### Step 4.1: Simple Health Check

```bash
# Test that site loads
curl -I https://bulk-gpt-app.vercel.app
# Expected: 200 OK or 307 Redirect
```

#### Step 4.2: Test /api/process Endpoint

**Prerequisites**:
- You need a valid authentication token (from production)
- You need to be logged in to the app first

**Test Script**:
```bash
# Replace <AUTH_TOKEN> with actual token from browser
# (Get from: DevTools → Application → Cookies → sb-[project]-auth-token)

curl -X POST https://bulk-gpt-app.vercel.app/api/process \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "csvFilename": "test.csv",
    "rows": [
      {"name": "John Doe", "role": "Engineer", "company": "ACME Corp"}
    ],
    "prompt": "Write a professional bio for {{name}} who works as {{role}} at {{company}}.",
    "outputColumn": "bio"
  }'
```

**Expected Response** (Status 202):
```json
{
  "batchId": "uuid-here",
  "status": "processing"
}
```

**Error Response** (Status 500 - if still broken):
```json
{
  "error": "Usage limit check failed",
  ...
}
```

#### Step 4.3: Monitor Logs

**Vercel Logs**:
```bash
# Via CLI
vercel logs --follow bulk-gpt-app

# Via Dashboard
# Go to: Deployments → Latest → Runtime Logs
```

**What to Look For**:
- ✅ No `[BULK_GPT_ERROR]` logs with "Usage limit check failed"
- ✅ Successful batch creation logs
- ❌ Any errors mentioning RPC or Supabase

---

## 🔍 Diagnosis Decision Tree

### If Error STILL Occurs After Steps 1-3:

**Check #1: Is the RPC function being called at all?**

Add temporary logging to `lib/api-keys.ts:191`:
```typescript
console.log('[DEBUG] Calling check_usage_limits for user:', userId)
const { data, error } = await supabaseAdmin.rpc(...)
console.log('[DEBUG] RPC result:', { data, error })
```

Redeploy and check logs.

**Check #2: Is the service role key correct?**

Test in Supabase SQL Editor:
```sql
-- This should work if service role key is correct
SELECT * FROM user_usage LIMIT 1;
```

**Check #3: Are there RLS policies blocking service role?**

Check RLS policies on `user_usage` table:
```sql
SELECT tablename, policyname, roles, qual::text
FROM pg_policies
WHERE tablename = 'user_usage';
```

If policies exist that don't exempt `service_role`, that's the issue.

**Check #4: Is there a different error?**

Look at the FULL error stack trace in Vercel logs. It might be a different issue masquerading as the usage limit error.

---

## 📊 Success Criteria

### ✅ Fix is Successful When:

1. **Database Check**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'check_usage_limits';
   -- Returns: check_usage_limits
   ```

2. **Function Test**:
   ```sql
   SELECT * FROM check_usage_limits('16212508-50d4-43be-bff2-51e4a26e07b4');
   -- Returns: One row with usage stats
   ```

3. **Deployment Check**:
   - Latest Vercel deployment shows commit `82af874` or later
   - Deployment status is "Ready"
   - Deployment time is after Nov 3, 2025 22:17 UTC

4. **API Test**:
   - POST to `/api/process` returns **202** (not 500)
   - Response includes `batchId`
   - No "Usage limit check failed" errors in logs

5. **End-to-End Test**:
   - User can upload CSV in production
   - User can start batch processing
   - Batch completes successfully
   - Results are stored and visible

---

## 🚨 Rollback Plan

If issues persist after applying fix:

### Option 1: Rollback Deployment

**Via Vercel Dashboard**:
1. Go to: Deployments
2. Find a known-good deployment (before the migration)
3. Click **Promote to Production**

### Option 2: Rollback Database Migration

**WARNING**: Only do this if migration caused issues AND you have no production data.

```sql
-- Drop the function
DROP FUNCTION IF EXISTS check_usage_limits(UUID);

-- Drop the table (WARNING: DELETES DATA)
DROP TABLE IF EXISTS user_usage CASCADE;

-- Drop the trigger (if exists)
DROP TRIGGER IF EXISTS batch_increment_usage ON batches;
```

### Option 3: Disable Usage Checking Temporarily

**Emergency Bypass** (modify `lib/api-keys.ts`):
```typescript
export async function checkUsageLimits(userId: string, rowCount: number): Promise<{
  allowed: boolean
  reason?: string
}> {
  // EMERGENCY: Bypass usage checking
  console.warn('[EMERGENCY] Usage checking disabled')
  return { allowed: true }
}
```

Redeploy. This removes usage limit protection but unblocks users.

---

## 📝 Related Files

### Migration Files
- `supabase/migrations/20251029094229_api_keys_and_usage.sql` - Creates `check_usage_limits` function
- `supabase/migrations/20251031000000_fix_batch_rls_for_service_role.sql` - Fixes RLS for service role

### Code Files
- `lib/api-keys.ts:186-233` - `checkUsageLimits()` function (✅ FIXED)
- `app/api/process/route.ts:80` - Calls `checkUsageLimits()`
- `lib/supabase.ts:10-15` - `supabaseAdmin` client initialization

### Documentation
- `NEXT_STEPS_FOR_USER.md` - RLS policy investigation guide
- `PRODUCTION_BATCH_FAILURE_INVESTIGATION.md` - Batch failure analysis
- `FIX_PLAN.md` - Fix plan for RLS issues

---

## 🎯 Recommended Execution Order

**FASTEST PATH TO FIX** (15-30 minutes):

1. **[5 min]** Verify database migration (Priority 1, Step 1.1)
2. **[5 min]** If missing, apply migration (Priority 1, Step 1.2)
3. **[2 min]** Test RPC function (Priority 1, Step 1.3)
4. **[5 min]** Check Vercel deployment status (Priority 2, Step 2.1)
5. **[5 min]** If needed, trigger redeploy (Priority 2, Step 2.2)
6. **[3 min]** Verify environment variables (Priority 3)
7. **[5 min]** Test production endpoint (Priority 4)
8. **[3 min]** Monitor logs for 2-3 minutes

**Total estimated time**: ~30 minutes

**SAFEST PATH** (If you want to be cautious):

1. Verify database migration first (Priority 1)
2. Test RPC function manually
3. Then trigger Vercel deployment (Priority 2)
4. Monitor closely for 5-10 minutes
5. Run full E2E test

---

## 📞 Need Help?

If issues persist after following this plan:

1. **Capture Evidence**:
   - Screenshot of Supabase RPC function check
   - Screenshot of Vercel deployment (with commit hash)
   - Screenshot of environment variables (redact keys)
   - Copy-paste of error logs from Vercel

2. **Provide Context**:
   - Which steps you completed
   - What the results were
   - Any error messages encountered

3. **Next Steps**:
   - I can investigate deeper
   - We can schedule a pair programming session
   - We can escalate to Supabase/Vercel support if infrastructure issue

---

**Created**: November 3, 2025
**Status**: ⏳ READY FOR EXECUTION
**Confidence**: 95% (fix is correct, just needs to be applied)

