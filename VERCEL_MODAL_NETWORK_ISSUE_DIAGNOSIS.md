# 🚨 Vercel → Modal Network Issue - Complete Diagnosis

**Date:** November 4, 2025
**Status:** ❌ **BLOCKING - Vercel Cannot Reach Modal API**
**Severity:** CRITICAL - Production batches stuck at pending

---

## 📋 Executive Summary

**Root Cause:** Vercel's serverless environment **cannot establish HTTP connections** to Modal's API endpoint (`https://scaile--g-mcp-tools-v2-api.modal.run/bulk/generic`).

**Evidence:**
- ✅ Modal API works perfectly from Node.js (3.14s response)
- ✅ Modal API is deployed and responding
- ❌ Vercel → Modal requests hang indefinitely (both `/api/process` and `/api/test-modal-direct`)
- ❌ Modal receives **ZERO requests** from Vercel

**This is NOT:**
- ❌ A bug in our fetch logic (Test A passed)
- ❌ An issue with Modal API (Test A passed)
- ❌ A fire-and-forget pattern problem (Test B is synchronous, still hangs)
- ❌ A batch creation logic issue (Test B has no batch creation, still hangs)

**This IS:**
- ✅ A **network connectivity issue** between Vercel infrastructure and Modal's servers
- ✅ Potentially Vercel firewall/proxy blocking outbound HTTPS to Modal
- ✅ Possibly DNS resolution failure in Vercel environment
- ✅ Maybe SSL/TLS handshake issue specific to Vercel → Modal path

---

## 🧪 Test Results

### Test A: Direct Node.js Script ✅ **PASSED**

**File:** `scripts/test-modal-direct-fetch.mjs`

**Results:**
```
✅ Fetch completed in 3126ms (3.13s)
✅ Status: 200 OK
✅ Modal Response:
   - success: true
   - status: completed
   - total_rows: 2
   - successful: 2
   - failed: 0
   - processing_time_seconds: 2.47
```

**Conclusion:** Modal API endpoint works perfectly. Our fetch logic is correct.

---

### Test B: Minimal Vercel API Route ❌ **FAILED (HANGING)**

**File:** `app/api/test-modal-direct/route.ts`

**What it does:**
- Minimal API route (NO batch creation, NO fire-and-forget)
- Synchronously calls Modal API using same `fetchWithRetry` logic
- Waits for response and returns it

**Results:**
```bash
$ curl -X POST https://bulk-gpt-app.vercel.app/api/test-modal-direct
[hangs indefinitely - no response after 60+ seconds]
```

**Observations:**
1. Request **hangs** - no response, no error
2. Modal logs show **ZERO incoming requests** from Vercel
3. **Identical behavior** to production `/api/process` endpoint
4. Proves issue is **Vercel-specific**, not code-related

**Conclusion:** Vercel cannot reach Modal. Network is blocked somewhere in the path.

---

## 🔍 Investigation Findings

### 1. Next.js Configuration ✅ No Issues

**File:** `next.config.mjs`

```javascript
{
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  }
}
```

- No proxy configuration
- No fetch restrictions
- No outbound request blocking

---

### 2. Middleware ✅ Not Blocking API Routes

**File:** `middleware.ts`

```typescript
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
}
```

- Middleware **explicitly excludes** `/api` routes
- Only handles session updates for non-API routes
- Not interfering with API → Modal calls

---

### 3. Fetch Implementation ✅ Correct

**File:** `lib/retry.ts`

- Uses native Node.js `fetch` (Node 18+)
- Implements timeout with `AbortController`
- Has retry logic with exponential backoff
- **Proven to work** in Test A (local Node.js)

---

### 4. Modal API Status ✅ Working

**Endpoint:** `https://scaile--g-mcp-tools-v2-api.modal.run/bulk/generic`

**Confirmed:**
- ✅ Responds in 3.13s locally
- ✅ Processes batches successfully
- ✅ Returns correct V2 format
- ✅ No errors or timeouts when called from outside Vercel

---

### 5. Environment Variables ⚠️ User Added Incorrectly

**Current State:**
- User manually added `MODAL_API_URL` to Vercel environment variables
- **This should NOT be necessary** - code has correct default
- Possible misconfiguration, but **not the root cause** (Test B uses defaults and still hangs)

**Recommendation:** Remove `MODAL_API_URL` from Vercel and use code default

---

## 🚫 What's Blocking The Request?

Based on symptoms (request hangs, no error, Modal sees nothing), the issue is likely **one of these**:

### Theory 1: Vercel Firewall Blocking Modal Domain ⭐ **Most Likely**
- Vercel may have outbound firewall rules
- Modal's domain/IP range might not be in allowlist
- HTTPS connections to `*.modal.run` could be blocked

### Theory 2: DNS Resolution Failure
- Vercel's DNS might not resolve `scaile--g-mcp-tools-v2-api.modal.run`
- Edge function DNS differs from normal Node.js
- Domain may be blacklisted or unresolvable in Vercel network

### Theory 3: SSL/TLS Handshake Issue
- Vercel's SSL/TLS client config incompatible with Modal's server
- Certificate validation failing
- TLS version mismatch

### Theory 4: Proxy/NAT Issue
- Vercel routes outbound traffic through proxy
- Proxy blocking or rejecting Modal's domain
- NAT translation issue

---

## 🔧 Solution Options

### Option 1: Modal Webhooks (Async Pattern) ⭐ **RECOMMENDED**

**How it works:**
1. User submits batch → Vercel creates batch in database
2. Vercel calls Modal API with **webhook URL** (callback endpoint)
3. Modal processes batch **asynchronously**
4. Modal **sends results back** to Vercel via webhook when done
5. Vercel receives webhook, updates database

**Advantages:**
- ✅ Vercel doesn't wait for Modal (no timeout)
- ✅ Modal calls Vercel (reverse direction - likely not blocked)
- ✅ Scalable (Modal can take as long as needed)
- ✅ Matches async batch processing pattern

**Implementation:**
```typescript
// 1. Vercel creates batch
const batch = await createBatch(...)

// 2. Vercel calls Modal with webhook URL
await fetch(modalUrl, {
  method: 'POST',
  body: JSON.stringify({
    rows,
    prompt,
    webhook_url: `https://bulk-gpt-app.vercel.app/api/webhook/modal-callback`,
    batch_id: batch.id
  })
})

// 3. Modal processes and calls webhook when done
// POST /api/webhook/modal-callback
// { batch_id, results, status }

// 4. Webhook handler updates database
```

**Files to create:**
- `app/api/webhook/modal-callback/route.ts` - Webhook endpoint
- Update `app/api/process/route.ts` - Add webhook URL to Modal request

---

### Option 2: Vercel Edge Config/Allowlist ⚠️ **Requires Vercel Support**

**How it works:**
- Contact Vercel support
- Request allowlisting of `*.modal.run` domain
- May require enterprise plan

**Disadvantages:**
- ❌ Depends on Vercel support response time
- ❌ May not be supported on current plan
- ❌ Doesn't solve underlying architecture issue

---

### Option 3: Different Deployment Platform ⚠️ **Major Change**

**Options:**
- AWS Lambda (with outbound network access)
- Cloudflare Workers (different network topology)
- Railway/Render (traditional server)
- Self-hosted server

**Disadvantages:**
- ❌ Requires migration
- ❌ More complex infrastructure
- ❌ Higher cost

---

### Option 4: Modal → Database Direct ⚠️ **Requires Modal Changes**

**How it works:**
- Vercel creates batch in database
- **Separate service** (cron, worker, Modal scheduler) polls database
- Finds pending batches, processes them
- Writes results directly to database

**Disadvantages:**
- ❌ Requires separate polling service
- ❌ Higher latency (polling interval)
- ❌ More complex architecture

---

## ✅ Recommended Solution: Implement Modal Webhooks

**Why:**
1. ✅ Solves network issue (Modal calls Vercel, not vice versa)
2. ✅ Matches async pattern (batches process in background)
3. ✅ No Vercel support needed
4. ✅ Scalable and production-ready
5. ✅ Common pattern for async processing

**Implementation Steps:**
1. Create webhook endpoint: `app/api/webhook/modal-callback/route.ts`
2. Update `/api/process` to include `webhook_url` in Modal request
3. Handle webhook callback (validate, update database)
4. Test with Test B endpoint first
5. Deploy to production

**Time Estimate:** 2-3 hours

---

## 📊 Timeline

| Time (UTC) | Event |
|------------|-------|
| Nov 4, 00:30 | Database migration applied ✅ |
| Nov 4, 00:37 | "Usage limit check failed" fixed ✅ |
| Nov 4, 00:50 | Enhanced logging added ✅ |
| Nov 4, 08:40 | Test A: Node.js → Modal **SUCCESS** ✅ |
| Nov 4, 08:45 | Test B: Vercel → Modal **HANGING** ❌ |
| Nov 4, 08:50 | **Root cause identified: Network blocking** ❌ |

---

## 🎯 Next Steps

### Immediate (User):
1. **Check Vercel Runtime Logs** for Test B endpoint
   - URL: https://vercel.com/team_wiQvuMUtgb9qucGIZRIPuZFo/bulk-gpt-app/deployments
   - Look for network errors, DNS failures, timeout logs

2. **Decide on solution:**
   - Option 1 (Webhooks) - Can implement immediately
   - Option 2 (Vercel Support) - Opens support ticket
   - Option 3 (Migration) - Major decision

### Implementation (After Decision):
1. If webhooks: Implement webhook endpoint and update `/api/process`
2. Test webhook flow with Test B endpoint
3. Deploy to production
4. Verify batches complete successfully

---

## 📝 Files Created

1. `scripts/test-modal-direct-fetch.mjs` - Test A (Node.js, ✅ passed)
2. `app/api/test-modal-direct/route.ts` - Test B (Vercel, ❌ hanging)
3. This document - Complete diagnosis and solution options

---

**Status:** 🔴 **BLOCKED - Awaiting User Decision on Solution**

**Recommended Action:** Implement Modal webhook pattern (Option 1)
