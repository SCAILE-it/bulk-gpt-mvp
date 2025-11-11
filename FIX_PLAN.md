# Production Batch Processing Fix Plan

**Date**: 2025-10-31
**Issue**: FK constraint violation prevents Modal from saving batch results
**Reference**: PRODUCTION_BATCH_FAILURE_INVESTIGATION.md

---

## Problem Statement

Modal successfully processes batches but cannot save results due to:
```
Foreign key constraint "batch_results_batch_id_fkey" violation
Key (batch_id)=(xxx) is not present in table "batches"
```

Despite Modal being able to UPDATE the batch (200 OK), it cannot INSERT results referencing the same batch_id (409 Conflict).

**Most Likely Root Cause**: Row-Level Security (RLS) policy on `batches` table prevents service role queries from seeing batches created by authenticated users.

---

## Investigation Steps (MUST DO FIRST)

### Step 1: Check Supabase RLS Policies ⭐ **CRITICAL**

**Goal**: Confirm if RLS is blocking service role from seeing batches.

**Method A: Supabase Dashboard** (RECOMMENDED - Fastest)
1. Navigate to https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn
2. Go to Database → Tables → `batches`
3. Click "RLS" or "Policies" tab
4. Check for policies like:
   - `(auth.uid() = user_id)` - Would block service role
   - `(auth.role() = 'authenticated')` - Would block service role
5. Check if "Enable RLS" is ON

**Method B: SQL Query** (If dashboard not accessible)
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('batches', 'batch_results');

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('batches', 'batch_results')
ORDER BY tablename, policyname;
```

Run via:
```bash
supabase db remote exec --linked "SELECT ..."
```

**Expected Findings**:

**Scenario A - RLS Blocking Service Role** (Most likely):
- `batches` table has RLS enabled
- Policy exists like: `(auth.uid() = user_id)`
- Service role queries return 0 rows for user-created batches
- **Fix**: Add policy exception for service role OR disable RLS

**Scenario B - No RLS Issue**:
- RLS disabled OR
- Policy allows service role reads
- **Next**: Check Step 2 (transaction timing)

### Step 2: Test Service Role SELECT Access

**Goal**: Verify service role can actually read batches created by users.

**Method**: Direct Supabase query using service role key.

```bash
# Create test batch via frontend (logged in as test@bulkgpt.local)
# Note the batch_id from browser console or network tab

# Query as service role
curl -X GET "https://ayjpnfzbxhcwwxvobssn.supabase.co/rest/v1/batches?id=eq.BATCH_ID_HERE" \
  -H "apikey: ANON_KEY_HERE" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY_HERE" \
  -H "Content-Type: application/json"
```

**Expected Results**:

**If RLS blocking**: Empty response `[]` even though batch exists
**If RLS not blocking**: Batch data returned

### Step 3: Check Modal's Actual Query

**Goal**: Verify what Modal does before INSERT.

**Location**: `modal-processor/main.py` around line 492-524

**Check for**:
- Does Modal verify batch exists before INSERT?
- Does Modal use correct headers (Authorization, apikey)?
- Does Modal query correctly handle service role permissions?

---

## Fix Options (After Investigation)

### Option A: Fix RLS Policy ⭐ **RECOMMENDED IF RLS IS THE ISSUE**

**When to use**: Investigation confirms RLS blocking service role

**Changes Required**:

#### 1. Update RLS Policy on `batches` Table

**Current Policy** (assumed):
```sql
CREATE POLICY "Users can only see their own batches"
ON batches FOR SELECT
USING (auth.uid() = user_id);
```

**Fixed Policy**:
```sql
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can only see their own batches" ON batches;

-- Create new policy allowing service role bypass
CREATE POLICY "Users and service role can see batches"
ON batches FOR SELECT
USING (
  auth.uid() = user_id  -- Users see their own
  OR
  auth.jwt()->>'role' = 'service_role'  -- Service role sees all
);
```

**Alternative (More explicit)**:
```sql
-- Policy for authenticated users
CREATE POLICY "Users can see own batches"
ON batches FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy for service role
CREATE POLICY "Service role can see all batches"
ON batches FOR SELECT
TO service_role
USING (true);  -- No restrictions for service role
```

#### 2. Verify `batch_results` Table Policies

Ensure INSERT policy allows service role:

```sql
-- Check current policy
SELECT * FROM pg_policies WHERE tablename = 'batch_results';

-- If restricted, add service role exception
CREATE POLICY "Service role can insert results"
ON batch_results FOR INSERT
TO service_role
WITH CHECK (true);
```

#### 3. Test Fix

```bash
# Re-run Playwright test
npx playwright test playwright-tests/test-pending-fix-production-direct.spec.ts --project=no-auth

# Check Modal logs
modal app logs bulk-gpt-processor-mvp --tail 50
```

**Success Criteria**:
- No FK constraint errors in Modal logs
- Rows transition from "Waiting" → "Processing" → "Done"
- BatchStatusCard shows correct counts

**Pros**:
- ✅ Minimal code changes
- ✅ Fixes root cause
- ✅ Preserves user data isolation for user queries
- ✅ Service role bypasses RLS as intended

**Cons**:
- ⚠️ Requires database migration
- ⚠️ Need to verify other tables don't have same issue

**Risk**: LOW - Standard Supabase pattern

---

### Option B: Disable RLS on `batches` and `batch_results`

**When to use**: Quick fix for testing, NOT for production

**Changes**:
```sql
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_results DISABLE ROW LEVEL SECURITY;
```

**Pros**:
- ✅ Quickest fix
- ✅ Guaranteed to work

**Cons**:
- ❌ Security issue - any user can see any batch
- ❌ NOT production-grade
- ❌ Violates multi-tenant best practices

**Risk**: HIGH - Only use for debugging

---

### Option C: Change Modal to Use Anon Key + User JWT

**When to use**: If service role MUST NOT see user data

**Changes Required**:

#### 1. Pass User Auth Token to Modal

**Frontend** (`app/api/batch/process/route.ts` or similar):
```typescript
// Get user's session token
const { data: { session } } = await supabase.auth.getSession()
const userToken = session?.access_token

// Call Modal with user token
const response = await fetch(MODAL_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`  // User's JWT
  },
  body: JSON.stringify({
    batch_id,
    rows,
    prompt,
    user_token: userToken  // Pass to Modal
  })
})
```

#### 2. Update Modal to Use User Token

**Modal** (`modal-processor/main.py`):
```python
from supabase import create_client

@app.function(
    secrets=[modal.Secret.from_name("bulk-gpt-env")],
    image=image,
    timeout=600,
)
@modal.web_endpoint(method="POST")
def process_batch(request: dict):
    user_token = request.get("user_token")  # Get from request

    # Create Supabase client with user's token
    supabase = create_client(
        os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
        os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),  # Use anon key
        options={
            "headers": {
                "Authorization": f"Bearer {user_token}"  # User's JWT
            }
        }
    )

    # Now queries run as the user
    batch = supabase.table("batches").select("*").eq("id", batch_id).single().execute()
    # ... rest of processing
```

**Pros**:
- ✅ Preserves RLS security model
- ✅ Modal acts on behalf of user
- ✅ No database policy changes

**Cons**:
- ⚠️ More complex implementation
- ⚠️ User token could expire during long batches
- ⚠️ Token refresh logic needed
- ⚠️ Security risk if token leaked in logs

**Risk**: MEDIUM - More moving parts

---

### Option D: Modal Creates Own Batch Record

**When to use**: If frontend and Modal should be decoupled

**Architecture Change**:

**Current Flow**:
```
Frontend → Create batch in DB → Call Modal with batch_id
Modal → Read batch → Process → Insert results
```

**New Flow**:
```
Frontend → Call Modal with data (no batch_id)
Modal → Create batch in DB → Process → Insert results → Return batch_id
Frontend → Poll batch status using returned batch_id
```

**Changes Required**:

#### 1. Frontend Calls Modal Without Pre-creating Batch

```typescript
// BEFORE
const batch = await createBatch(csvData, prompt)
await callModal(batch.id)

// AFTER
const batch = await callModal(csvData, prompt)  // Modal creates batch
```

#### 2. Modal Creates Batch

```python
# Modal receives raw data, creates batch itself
batch = supabase.table("batches").insert({
    "user_id": "system",  # Or from user_token
    "status": "processing",
    "created_at": datetime.now()
}).execute()

batch_id = batch.data[0]["id"]

# Process rows
for row in rows:
    # ... AI processing

    # Insert result (no FK issue - batch exists)
    supabase.table("batch_results").insert({
        "batch_id": batch_id,
        "row_id": row["id"],
        "status": "success",
        "result": result
    }).execute()
```

**Pros**:
- ✅ Eliminates FK timing issues
- ✅ Single source of truth for batch creation
- ✅ Modal fully owns batch lifecycle

**Cons**:
- ❌ Major architecture change
- ❌ Frontend loses control over batch creation
- ❌ Harder to show batch UI before processing starts
- ❌ RLS issue still exists if user_id doesn't match

**Risk**: HIGH - Significant refactor

---

## Recommended Approach

### Phase 1: Investigation (REQUIRED - DO THIS FIRST)

**Estimated Time**: 15 minutes

1. ✅ Check Supabase dashboard for RLS policies on `batches` table
2. ✅ Test service role SELECT access with curl
3. ✅ Confirm FK error root cause

**Decision Point**:
- **If RLS blocking**: → Go to Phase 2 (Option A)
- **If NOT RLS**: → Investigate transaction timing or other causes

### Phase 2: Implement Fix (After Investigation)

**If RLS is the issue** → **Option A: Fix RLS Policy** ⭐ RECOMMENDED

**Steps**:
1. Create database migration file
2. Update RLS policies to allow service role
3. Test with Playwright
4. Verify in production
5. Monitor for issues

**Estimated Time**: 30 minutes

**Success Criteria**:
- ✅ Playwright test passes (rows complete processing)
- ✅ No FK errors in Modal logs
- ✅ BatchStatusCard shows correct final counts
- ✅ User isolation preserved (users still can't see other users' batches)

### Phase 3: Verification

1. Run Playwright test: `npx playwright test playwright-tests/test-pending-fix-production-direct.spec.ts --project=no-auth`
2. Check Modal logs: `modal app logs bulk-gpt-processor-mvp --tail 100`
3. Manual production test with real user account
4. Verify pending count bug fix (original issue)

---

## Migration File Template

**File**: `supabase/migrations/YYYYMMDDHHMMSS_fix_batch_rls_for_service_role.sql`

```sql
-- Fix RLS policies to allow service role access to batches and batch_results
-- This resolves FK constraint errors when Modal tries to insert results

-- ============================================================================
-- batches table
-- ============================================================================

-- Drop existing restrictive policies (if they exist)
DROP POLICY IF EXISTS "Users can only see their own batches" ON batches;
DROP POLICY IF EXISTS "Users can only read own batches" ON batches;

-- Create policy for authenticated users (read own batches)
CREATE POLICY "authenticated_users_select_own_batches"
ON batches FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for service role (read all batches)
CREATE POLICY "service_role_select_all_batches"
ON batches FOR SELECT
TO service_role
USING (true);

-- Allow service role to update batch status
CREATE POLICY "service_role_update_batches"
ON batches FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- batch_results table
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can only see their own results" ON batch_results;

-- Allow users to see results for their batches (via JOIN)
CREATE POLICY "users_select_own_batch_results"
ON batch_results FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM batches
    WHERE batches.id = batch_results.batch_id
    AND batches.user_id = auth.uid()
  )
);

-- Allow service role to insert results (THIS FIXES THE FK ERROR)
CREATE POLICY "service_role_insert_batch_results"
ON batch_results FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to update results
CREATE POLICY "service_role_update_batch_results"
ON batch_results FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Allow service role to select all results
CREATE POLICY "service_role_select_all_batch_results"
ON batch_results FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify RLS is still enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('batches', 'batch_results');

-- List all policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('batches', 'batch_results')
ORDER BY tablename, policyname;
```

**To apply**:
```bash
# Run migration
supabase db push

# Or manually via SQL editor in Supabase dashboard
# Copy-paste the SQL above
```

---

## Testing Plan

### Test 1: Service Role Can Read User-Created Batches

**Setup**:
1. Login as `test@bulkgpt.local` on production
2. Create batch via UI (upload CSV, configure, click "Run All")
3. Note batch_id from network tab

**Test**:
```bash
BATCH_ID="xxx-from-step-3"
SERVICE_KEY="eyJhbGci..."  # From .env.local

curl -X GET "https://ayjpnfzbxhcwwxvobssn.supabase.co/rest/v1/batches?id=eq.$BATCH_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY"
```

**Expected**: Batch data returned (not empty array)

### Test 2: Modal Can Insert Results

**Test**: Run Playwright test
```bash
npx playwright test playwright-tests/test-pending-fix-production-direct.spec.ts --project=no-auth
```

**Expected**:
- Rows transition: "Waiting" → "Processing" → "Done"
- No FK errors in Modal logs
- Final state: Success=3, Failed=0, Pending=0

### Test 3: User Isolation Preserved

**Setup**:
1. Create batch as `test@bulkgpt.local`
2. Login as different user

**Test**: Try to access first user's batch via API
```bash
curl -X GET "https://ayjpnfzbxhcwwxvobssn.supabase.co/rest/v1/batches?id=eq.$BATCH_ID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $OTHER_USER_JWT"
```

**Expected**: Empty array (RLS blocks access to other users' batches)

---

## Rollback Plan

If RLS fix causes issues:

```sql
-- Rollback: Remove service role policies
DROP POLICY IF EXISTS "service_role_select_all_batches" ON batches;
DROP POLICY IF EXISTS "service_role_update_batches" ON batches;
DROP POLICY IF EXISTS "service_role_insert_batch_results" ON batch_results;
DROP POLICY IF EXISTS "service_role_update_batch_results" ON batch_results;
DROP POLICY IF EXISTS "service_role_select_all_batch_results" ON batch_results;

-- Restore original user-only policies
CREATE POLICY "users_only_policy"
ON batches FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_only_results_policy"
ON batch_results FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM batches
    WHERE batches.id = batch_results.batch_id
    AND batches.user_id = auth.uid()
  )
);
```

---

## Open Questions

1. **Are there other tables with same RLS issue?**
   - Check all tables Modal writes to
   - Apply same fix pattern

2. **Should we add monitoring?**
   - Track FK errors in Modal
   - Alert if batch processing fails
   - Sentry/logging integration

3. **Do we need batch processing timeout?**
   - Currently batches can hang forever
   - Add timeout mechanism?
   - Auto-fail stuck batches?

4. **Should we audit all RLS policies?**
   - Comprehensive review of all table policies
   - Document service role access patterns
   - Create RLS testing suite

---

## Timeline Estimate

| Phase | Task | Time | Who |
|-------|------|------|-----|
| 1 | Investigate RLS policies | 15 min | Claude |
| 2 | Create migration file | 15 min | Claude |
| 3 | Test locally (if possible) | 15 min | Claude |
| 4 | Apply migration to production | 5 min | User |
| 5 | Run Playwright verification | 5 min | Claude |
| 6 | Verify pending count fix | 10 min | Claude |
| 7 | Manual production testing | 15 min | User |
| **TOTAL** | | **80 min** | |

---

## Success Metrics

**Must Have** (P0):
- ✅ No FK constraint errors in Modal logs
- ✅ Batches complete processing on production
- ✅ Rows show "Done" status after AI processing
- ✅ Playwright test passes end-to-end

**Should Have** (P1):
- ✅ BatchStatusCard shows correct final counts (pending count bug fix verified)
- ✅ User data isolation preserved (users can't see other users' batches)
- ✅ No security regressions

**Nice to Have** (P2):
- ✅ Migration rollback tested
- ✅ Monitoring/alerts added
- ✅ Documentation updated
- ✅ Other RLS policies audited

---

## Next Immediate Action

**START HERE**: Run Step 1 of Investigation

```bash
# Check current RLS policies
supabase db remote exec --linked "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('batches', 'batch_results');
"

# Check existing policies
supabase db remote exec --linked "
SELECT tablename, policyname, cmd, roles, qual::text as using_clause
FROM pg_policies
WHERE tablename IN ('batches', 'batch_results')
ORDER BY tablename, policyname;
"
```

**Based on output** → Proceed to Option A if RLS confirmed as issue.

---

**Status**: Ready to investigate
**Blocking**: None
**Dependencies**: Supabase CLI, production access
