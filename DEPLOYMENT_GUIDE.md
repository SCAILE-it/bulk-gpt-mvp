# Deployment Guide - Bulk GPT

**Last Updated:** January 2025  
**Status:** Production Ready

---

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry (Optional)
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

### 2. Database Migrations
Run all Supabase migrations:

```bash
# Using Supabase CLI
supabase db push

# Or manually apply migrations in order:
# - 001_initial_schema.sql
# - 002_add_batch_results.sql
# - 003_add_saved_prompts.sql
# - 004_add_api_keys.sql
# - 005_create_scheduled_runs.sql
# - etc.
```

### 3. Build Verification
Test production build locally:

```bash
# Install dependencies
npm install

# Build production
npm run build

# Test production build
npm start

# Verify no build errors
# Check .next folder for bundle sizes
```

### 4. Performance Verification
- [ ] Check bundle sizes in `.next/static/chunks/`
- [ ] Verify code splitting is working (AnalyticsDashboard loads separately)
- [ ] Test SWR caching (navigate away and back, should be instant)
- [ ] Verify cache headers on API routes

### 5. Testing
Run test suite:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Tests (if available)
npm test

# E2E tests (if available)
npm run test:e2e
```

---

## 📦 Deployment Platforms

### Vercel (Recommended)

#### Automatic Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or deploy preview
vercel
```

#### Vercel Configuration
Create `vercel.json` (optional):

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Other Platforms

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod
```

#### Docker
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 🔍 Post-Deployment Verification

### 1. Health Checks
- [ ] Homepage loads: `https://your-domain.com`
- [ ] Auth page works: `https://your-domain.com/auth`
- [ ] API routes respond: `https://your-domain.com/api/health` (if exists)
- [ ] No console errors in browser

### 2. Performance Monitoring
- [ ] Check Core Web Vitals in browser console (should see `[Web Vitals]` logs)
- [ ] Verify analytics tracking (PostHog/Sentry if configured)
- [ ] Monitor API response times
- [ ] Check bundle sizes in Network tab

### 3. Functionality Tests
- [ ] User can sign in
- [ ] CSV upload works
- [ ] Batch processing works
- [ ] Results download works
- [ ] Analytics dashboard loads
- [ ] Tool categories display correctly

### 4. Error Monitoring
- [ ] Check Sentry dashboard for errors (if configured)
- [ ] Monitor server logs for errors
- [ ] Check browser console for client errors
- [ ] Verify error boundaries work

---

## 📊 Performance Monitoring

### Core Web Vitals
The app automatically tracks Core Web Vitals:

- **LCP** (Largest Contentful Paint) - Target: < 2.5s
- **FID** (First Input Delay) - Target: < 100ms
- **CLS** (Cumulative Layout Shift) - Target: < 0.1
- **FCP** (First Contentful Paint) - Target: < 1.8s
- **TTFB** (Time to First Byte) - Target: < 800ms

**View metrics:**
- Browser console: `[Web Vitals]` logs (development)
- PostHog: `web_vital` events (if configured)
- Vercel Analytics: Automatic (if enabled)

### API Performance
API routes log performance metrics:

```
[PERF] Context files fetch: {
  total: "245ms",
  auth: "12ms",
  query: "180ms",
  transform: "53ms",
  fileCount: 5
}
```

**Monitor:**
- Server logs for `[PERF]` entries
- Set up alerts for slow queries (>500ms)
- Track cache hit rates

---

## 🔧 Troubleshooting

### Build Errors

#### Module Not Found
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

#### Type Errors
```bash
# Check TypeScript
npm run type-check

# Fix common issues:
# - Missing type definitions
# - Incorrect imports
# - Type mismatches
```

### Runtime Errors

#### 404 on Static Assets
- Verify `public/` folder is included in build
- Check `next.config.js` for asset configuration
- Ensure manifest.json exists

#### API Route Errors
- Check environment variables
- Verify Supabase connection
- Check server logs for detailed errors
- Verify database migrations are applied

#### Performance Issues
- Check bundle sizes (should be < 500KB initial)
- Verify code splitting is working
- Check cache headers on API responses
- Monitor Core Web Vitals

---

## 🔐 Security Checklist

- [ ] Environment variables are secure (not in code)
- [ ] API keys are properly scoped
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled (if applicable)
- [ ] Authentication is working correctly
- [ ] RLS policies are enabled in Supabase
- [ ] HTTPS is enforced
- [ ] Security headers are set

### Security Headers
Add to `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ]
}
```

---

## 📈 Monitoring & Alerts

### Recommended Monitoring
1. **Uptime Monitoring** - UptimeRobot, Pingdom
2. **Error Tracking** - Sentry (already configured)
3. **Performance** - Vercel Analytics, PostHog
4. **API Monitoring** - Custom logs, Supabase dashboard

### Alert Thresholds
- **Uptime:** Alert if < 99.9%
- **Error Rate:** Alert if > 1%
- **Response Time:** Alert if > 1s (p95)
- **Core Web Vitals:** Alert if LCP > 2.5s

---

## 🔄 Rollback Plan

### Quick Rollback (Vercel)
1. Go to Vercel dashboard
2. Select previous deployment
3. Click "Promote to Production"

### Database Rollback
```bash
# Revert last migration
supabase migration down

# Or restore from backup
supabase db restore backup.sql
```

### Code Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or checkout previous version
git checkout <previous-commit>
git push origin main --force
```

---

## 📝 Post-Deployment Tasks

1. **Monitor for 24 hours**
   - Check error rates
   - Monitor performance metrics
   - Watch for user reports

2. **Verify Features**
   - Test all critical user flows
   - Verify analytics tracking
   - Check email notifications (if applicable)

3. **Documentation**
   - Update deployment notes
   - Document any issues encountered
   - Update runbook if needed

4. **Team Communication**
   - Notify team of deployment
   - Share performance metrics
   - Document any breaking changes

---

## ✅ Success Criteria

Deployment is successful when:

- ✅ All health checks pass
- ✅ No critical errors in logs
- ✅ Core Web Vitals meet targets
- ✅ API response times < 500ms (p95)
- ✅ User authentication works
- ✅ All features functional
- ✅ Analytics tracking works
- ✅ Error monitoring active

---

## 📞 Support

If issues arise:

1. Check server logs
2. Check browser console
3. Check error tracking (Sentry)
4. Review this guide
5. Check GitHub issues
6. Contact team lead

---

**Last Updated:** January 2025  
**Next Review:** After first production deployment


