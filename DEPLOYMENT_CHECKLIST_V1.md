# 🚀 DEPLOYMENT CHECKLIST - V1 BETA

**Target:** Deploy within 48 hours  
**Platform:** Vercel  
**Status:** Ready to deploy

---

## 📋 Pre-Deployment Checklist

### 1. Code Review ✓
- [ ] All Phase 1 changes committed
- [ ] No console.log statements in production code
- [ ] ESLint passing
- [ ] TypeScript compiling without errors

### 2. Environment Setup
- [ ] Create Vercel project
- [ ] Set up environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  MODAL_API_URL=
  ```
- [ ] Configure production domain
- [ ] Set up Vercel Analytics

### 3. Database Check
- [ ] Supabase tables exist (batches, batch_results)
- [ ] Row Level Security enabled
- [ ] Connection pooling configured
- [ ] Backup strategy in place

### 4. Modal Function
- [ ] Modal endpoint deployed and accessible
- [ ] API key/auth configured
- [ ] Test connection from Vercel

---

## 🚀 Deployment Steps

### Step 1: Final Local Test
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Build test
npm run build

# Type check
npm run type-check

# Run locally
npm run dev
```

### Step 2: Git Push
```bash
# Create release branch
git checkout -b release/v1-beta

# Commit all changes
git add .
git commit -m "feat: v1 beta release with rate limits"

# Push to GitHub
git push origin release/v1-beta
```

### Step 3: Vercel Deploy
1. Connect GitHub repo to Vercel
2. Select `release/v1-beta` branch
3. Configure build settings:
   - Framework: Next.js
   - Build command: `npm run build`
   - Output directory: `.next`
4. Add all environment variables
5. Deploy

### Step 4: Post-Deploy Verification
- [ ] Site loads at production URL
- [ ] Can login with test account
- [ ] Upload small CSV (< 10 rows)
- [ ] Process completes successfully
- [ ] Rate limits trigger at 1001 rows
- [ ] Error boundary works (trigger error)
- [ ] Beta banner displays

---

## 🧪 Smoke Tests

### Test 1: Basic Flow
1. Visit production URL
2. Login with test@example.com
3. Upload test-data.csv (5 rows)
4. Add prompt "Summarize {{name}}"
5. Click Run
6. Verify results appear
7. Export CSV

### Test 2: Rate Limits
1. Try uploading 1001 row CSV
2. Verify error: "Beta limit: Maximum 1,000 rows"
3. Upload 999 row CSV
4. Process successfully
5. Try another batch immediately
6. Verify: "Please wait for current batch"

### Test 3: Error Handling
1. Disconnect internet mid-process
2. Verify error boundary catches
3. Click "Try again"
4. Verify recovery works

---

## 📊 Monitoring Setup

### 1. Vercel Analytics
- [ ] Enable Web Analytics
- [ ] Enable Speed Insights
- [ ] Set up alerts for errors

### 2. Supabase Monitoring
- [ ] Check database metrics
- [ ] Monitor connection pool
- [ ] Set up slow query alerts

### 3. Error Tracking (Future)
```javascript
// Ready for Sentry
// SENTRY_DSN=xxx in env vars
```

---

## 📝 Launch Communications

### 1. Beta User Email
```
Subject: Bulk GPT Beta - Now Live!

Hi early adopters,

Bulk GPT is now live in beta! 

What you can do:
- Process up to 1,000 rows per batch
- Run 5 batches per day
- Export results as CSV

Beta limitations are in place to ensure stability.
Need more? Reply to join the unlimited waitlist.

Start here: [app.bulkgpt.com]

Report issues: support@bulkgpt.com
```

### 2. Landing Page Update
- Add "Beta" badge
- Update CTA to "Try Beta"
- Add limitations disclaimer
- Include feedback form link

---

## 🚨 Rollback Plan

If critical issues arise:

### Quick Rollback (< 5 min)
1. Vercel Dashboard → Deployments
2. Find last stable deployment
3. Click "..." → "Promote to Production"
4. Verify rollback complete

### Feature Flag Disable (< 1 min)
```javascript
// In middleware/rateLimits.ts
export const RATE_LIMITS = {
  maxRowsPerBatch: 10000, // Increase temporarily
  maxBatchesPerUser: 100,
  // ...
}
```

---

## ✅ Go/No-Go Criteria

**GO if all checked:**
- [ ] All smoke tests pass
- [ ] Rate limits working
- [ ] Error boundaries catching errors
- [ ] Modal integration working
- [ ] < 2s page load time

**NO-GO if any:**
- [ ] Build failures
- [ ] TypeScript errors
- [ ] Database connection issues
- [ ] Modal endpoint down
- [ ] Security vulnerabilities

---

## 📞 Team Contacts

**On-Call During Launch:**
- Engineering: [Your name]
- Product: [PM name]
- Support: [Support lead]

**Escalation Path:**
1. Check Vercel logs
2. Check Supabase logs
3. Check Modal logs
4. Rollback if needed

---

## 🎯 Success Metrics (First 24h)

- [ ] 50+ beta users signed up
- [ ] 100+ batches processed
- [ ] < 0.5% error rate
- [ ] < 2s avg response time
- [ ] 0 data loss incidents
- [ ] 5+ feedback submissions

---

## 🚀 Launch Status: READY

All systems go. Ship it! 🎉
