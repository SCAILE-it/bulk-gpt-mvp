# 🚀 Vercel Deployment Guide - Bulk GPT MVP

**Status:** Ready to deploy ✅
**Branch:** `main` (all V2 changes merged)
**Last Updated:** October 22, 2025

---

## Quick Deploy (5 Minutes)

### Step 1: Connect GitHub to Vercel

1. **Go to Vercel:** https://vercel.com/
2. **Sign in** with your GitHub account (SCAILE-it)
3. **Click "Add New..."** → **Project**
4. **Import Git Repository:**
   - Select: `SCAILE-it/bulk-gpt-mvp`
   - Click **Import**

### Step 2: Configure Project

**Framework Preset:** Next.js (auto-detected ✅)

**Root Directory:** `.` (leave as is)

**Build Settings:** (auto-configured ✅)
- Build Command: `next build`
- Output Directory: `.next`
- Install Command: `npm install`

### Step 3: Add Environment Variables

Click **Environment Variables** and add:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ayjpnfzbxhcwwxvobssn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDI1MTUsImV4cCI6MjA3NjIxODUxNX0.Z5UGim-MMeby07bNadd9ooS4JMmTQp32ytPCzRteeFE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY0MjUxNSwiZXhwIjoyMDc2MjE4NTE1fQ.1BFcQeilNU0r0PVbuoOkl8TOy7XVeb6K-T5X5_fpA-s

# Gemini API Key
GOOGLE_API_KEY=AIzaSyAIbr-zhTFp8r9n3r0Q2ZGf3fspMJLYDoE

# Modal Processor (Optional)
MODAL_API_URL=https://bulk-gpt-processor-mvp--process-batch.modal.run
```

**Important:** Set these for **Production**, **Preview**, and **Development** environments.

### Step 4: Deploy

1. Click **Deploy** button
2. Wait ~2 minutes for build to complete
3. Get your production URL: `https://bulk-gpt-mvp.vercel.app`

---

## Post-Deployment Verification

### ✅ Smoke Test Checklist

Once deployed, test the following:

```bash
# 1. Visit production URL
https://your-app.vercel.app

# 2. Test authentication
- Login with: test@example.com / password
- Should redirect to /bulk or /wizard

# 3. Test file upload
- Upload a CSV file
- Verify preview shows

# 4. Test processing
- Configure a prompt
- Run in "Test Mode" (processes 3 rows)
- Verify results appear

# 5. Test export
- Click "Export CSV"
- Verify download works
```

### Expected Results

✅ **Login:** Should work (demo auth)
✅ **Upload:** CSV files < 10MB accepted
✅ **Processing:** Real-time streaming results
✅ **Export:** CSV download with results

---

## Automatic Deployments

**Once connected, Vercel will auto-deploy:**

- ✅ Every push to `main` → Production deployment
- ✅ Every PR → Preview deployment
- ✅ Preview URLs shared in PR comments

### Managing Deployments

**Vercel Dashboard:** https://vercel.com/dashboard

- **Deployments tab:** See all deployments
- **Settings tab:** Update environment variables
- **Domains tab:** Add custom domain
- **Analytics tab:** View performance metrics

---

## Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Add your domain (e.g., `bulkgpt.yourdomain.com`)
3. Update DNS records (Vercel provides instructions)
4. SSL certificate auto-configured ✅

---

## Monitoring & Analytics

### Performance Metrics

**Vercel Analytics** (free):
- Automatically enabled
- View at: https://vercel.com/[your-project]/analytics

**Metrics tracked:**
- Core Web Vitals (LCP, FCP, CLS)
- Real user performance
- Geographic distribution

### Error Monitoring

**Recommended:** Add Sentry for error tracking

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure with wizard
npx @sentry/wizard@latest -i nextjs
```

---

## Rollback Plan

### If Issues Arise

**Option 1: Instant Rollback**
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click **...** menu → **Promote to Production**

**Option 2: Disable V2 Features**
1. Edit environment variable: `NEXT_PUBLIC_FEATURE_V2=false`
2. Redeploy

**Option 3: Revert Git Commit**
```bash
git revert HEAD
git push origin main
# Vercel auto-deploys the revert
```

---

## Environment Variables Reference

### Required

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key (secret) | Supabase Dashboard → Settings → API |
| `GOOGLE_API_KEY` | Gemini API key | https://makersuite.google.com/app/apikey |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `MODAL_API_URL` | Modal processor endpoint | Falls back to sync processing |
| `APOLLO_API_KEY` | Apollo.io API key | Lead finder disabled if not set |

---

## Production Checklist

Before announcing to users:

- [ ] Smoke test passed (login, upload, process, export)
- [ ] Custom domain configured (if desired)
- [ ] Error monitoring set up (Sentry recommended)
- [ ] Analytics verified working
- [ ] Team members can access
- [ ] API rate limits understood (Gemini: 15 requests/min)
- [ ] Backup plan documented

---

## Support & Troubleshooting

### Common Issues

**Build Fails:**
- Check environment variables are set
- Verify all variables copied correctly (no extra spaces)
- Check build logs in Vercel dashboard

**Runtime Errors:**
- Check browser console for errors
- Verify API keys are valid
- Check Supabase project is active

**Slow Performance:**
- Check Vercel Analytics for bottlenecks
- Verify Gemini API responding quickly
- Consider enabling caching

### Getting Help

**Vercel Support:**
- Community: https://github.com/vercel/next.js/discussions
- Docs: https://vercel.com/docs

**Project Issues:**
- GitHub: https://github.com/SCAILE-it/bulk-gpt-mvp/issues

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Watch for errors in Vercel dashboard
2. **Add real authentication** - Replace demo login with Supabase Auth
3. **Set up error tracking** - Install Sentry
4. **Custom domain** - Add your domain
5. **User feedback** - Collect feedback and iterate

---

**Deployment Time:** ~5 minutes
**First Deploy URL:** Will be `https://bulk-gpt-mvp-[random].vercel.app`
**Production URL:** Can customize later

🎉 **Ready to deploy!** Follow Step 1 above to get started.
