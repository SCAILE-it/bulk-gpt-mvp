# Deployment Checklist

**Date:** January 2025  
**Status:** ✅ **Ready for Production Deployment**

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [x] All TypeScript errors resolved
- [x] No linting errors
- [x] Build succeeds (`npm run build`)
- [x] Production cleanup complete (23 API routes)
- [x] UX components integrated (P0 & P1)

### Environment Variables
- [ ] Verify all required environment variables are set:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `OPENAI_API_KEY` (if used)
  - [ ] `GEMINI_API_KEY` (if used)
  - [ ] `MODAL_GTM_CLASSIFIER_ENDPOINT` (if using Modal)
  - [ ] Any other API keys or secrets

### Database
- [ ] Run database migrations:
  - [ ] `20250115000001_create_business_contexts.sql` (if needed)
  - [ ] `20250116000000_add_gtm_fields_to_business_contexts.sql`
  - [ ] `20250116000001_migrate_existing_users_gtm.sql`
  - [ ] `20250116000002_add_context_variables_to_business_contexts.sql`
  - [ ] `20250116000003_add_resource_relationships.sql` (if needed)

### Performance
- [ ] Verify Core Web Vitals monitoring is enabled
- [ ] Check that performance logs are gated (dev only)
- [ ] Verify error logging is enabled

### Security
- [ ] Review RLS policies in Supabase
- [ ] Verify API routes have proper authentication
- [ ] Check that sensitive data is not exposed in client-side code
- [ ] Verify environment variables are not exposed

---

## 🚀 Deployment Steps

### 1. Pre-Deployment
```bash
# Run final build check
npm run build

# Run type check
npm run type-check  # if available

# Run linting
npm run lint  # if available
```

### 2. Database Migrations
```bash
# Via Supabase CLI
supabase migration up

# Or via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Run migrations in order
# 3. Verify columns exist
```

### 3. Environment Variables
- [ ] Set all environment variables in deployment platform (Vercel/Netlify/etc.)
- [ ] Verify variables are loaded correctly
- [ ] Test that API routes can access environment variables

### 4. Deploy
```bash
# If using Vercel
vercel --prod

# If using Git-based deployment
git push origin main  # triggers deployment
```

### 5. Post-Deployment Verification
- [ ] Test authentication flow
- [ ] Test CSV upload
- [ ] Test batch processing
- [ ] Verify API routes respond correctly
- [ ] Check error logs for any issues
- [ ] Verify performance metrics are being collected
- [ ] Test mobile responsiveness
- [ ] Test accessibility features

---

## 📋 Post-Deployment Tasks

### Monitoring
- [ ] Set up error tracking (Sentry, PostHog, etc.)
- [ ] Monitor Core Web Vitals
- [ ] Set up uptime monitoring
- [ ] Configure alerting for critical errors

### Documentation
- [ ] Update deployment documentation
- [ ] Document environment variables
- [ ] Create runbook for common issues

### Testing
- [ ] Run smoke tests on production
- [ ] Test critical user flows
- [ ] Verify analytics are working
- [ ] Test error handling

---

## 🐛 Troubleshooting

### Build Errors
- Check TypeScript errors: `npm run build`
- Verify all dependencies are installed: `npm install`
- Check for missing environment variables

### Runtime Errors
- Check server logs
- Verify database connections
- Check API route responses
- Verify authentication is working

### Performance Issues
- Check Core Web Vitals
- Review API route performance logs
- Verify caching is working
- Check database query performance

---

## ✅ Deployment Sign-Off

**Ready for Deployment:** ✅ **Yes**

**Completed:**
- ✅ Production cleanup (23 routes)
- ✅ UX improvements (P0 & P1)
- ✅ Code quality checks
- ✅ Build verification

**Pending:**
- ⏳ Database migrations
- ⏳ Environment variable setup
- ⏳ Final deployment

---

**Last Updated:** January 2025  
**Status:** ✅ **Ready for Deployment**
