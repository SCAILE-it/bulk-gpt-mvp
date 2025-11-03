# Vercel Auto-Deploy Setup

**Date**: 2025-10-31
**Status**: Manual deployment working ✅ | Auto-deploy needs configuration ⚠️

## Current Situation

- ✅ **Manual deployment works** - Using Vercel API with token `n5n49QncV3TNT25hBJ8jWiwg`
- ❌ **No GitHub webhook configured** - Pushes to `main` branch DO NOT auto-deploy
- ✅ **Production URL**: `https://bulk-gpt-app.vercel.app`
- ✅ **Project ID**: `prj_5yZ1D9vd3jDjOsR6buu0k3VoYcGP`

## How to Enable Auto-Deploy

### Option 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/federico-de-pontes-projects/bulk-gpt-app/settings/git
2. Under "Git Integration", connect the GitHub repository:
   - Repository: `SCAILE-it/bulk-gpt-mvp`
   - Branch: `main`
   - Production branch: `main`
3. Save settings

This will automatically create a GitHub webhook that triggers deployments on push.

### Option 2: GitHub CLI (Manual)

If you have admin access to the GitHub repo, you can manually create a webhook:

```bash
gh api repos/SCAILE-it/bulk-gpt-mvp/hooks \
  -X POST \
  -f name='web' \
  -f active=true \
  -f config[url]='https://vercel.com/api/webhook/github' \
  -f config[content_type]='application/json' \
  -f config[secret]='YOUR_WEBHOOK_SECRET' \
  -F events[]=push \
  -F events[]=pull_request
```

**Note**: You'll need the webhook secret from Vercel settings.

## Verification

After setup, verify auto-deploy works:

1. Make a small change and commit:
   ```bash
   git commit --allow-empty -m "test: verify auto-deploy"
   git push origin main
   ```

2. Check deployment starts automatically:
   ```bash
   vercel --token n5n49QncV3TNT25hBJ8jWiwg ls
   ```

3. Verify on Vercel dashboard: https://vercel.com/federico-de-pontes-projects/bulk-gpt-app

## Manual Deployment (Current Workaround)

If auto-deploy isn't set up yet, deploy manually using:

```bash
# Deploy to production
curl -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer n5n49QncV3TNT25hBJ8jWiwg" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "bulk-gpt-app",
    "project": "prj_5yZ1D9vd3jDjOsR6buu0k3VoYcGP",
    "target": "production",
    "gitSource": {
      "type": "github",
      "ref": "main",
      "repoId": 1078246074
    }
  }'
```

## Recent Successful Deployment

**Deployment ID**: `dpl_GwQ4GG3WtVG64CLEjRKTgkuE3Pte`
**Commit**: `647441ba` (Modal timeout fix)
**Status**: ✅ READY and promoted to production
**Deployed**: 2025-10-31

**Changes included**:
- Increased Modal API timeout from 30s → 120s
- Reduced retry count from 3 → 2
- Allows Modal cold start (60-90s) to complete successfully

## Next Steps

1. Set up auto-deploy via Vercel dashboard (recommended)
2. Test batch processing works correctly in production
3. Document deployment workflow for team

---

**Created by**: Claude Code
**Last updated**: 2025-10-31
