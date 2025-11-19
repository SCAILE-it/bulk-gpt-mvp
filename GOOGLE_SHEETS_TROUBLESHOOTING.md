# Google Sheets Integration Troubleshooting Guide

## Error: "Google authentication cancelled or failed"

This error typically occurs when the Google OAuth flow fails. Here's how to diagnose and fix it:

### ✅ Step 1: Verify Environment Variables in Vercel

The environment variables ARE set in Vercel (verified). Make sure they match:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Should be your OAuth 2.0 Client ID
- `NEXT_PUBLIC_GOOGLE_API_KEY` - Should be your API Key
- `GOOGLE_CLIENT_SECRET` - Should be your OAuth 2.0 Client Secret

**To verify:**
```bash
vercel env ls | grep GOOGLE
```

### 🔍 Step 2: Check Google Cloud Console Configuration

The most common issue is **missing or incorrect Authorized JavaScript origins** and **Authorized redirect URIs**.

#### Required Settings in Google Cloud Console:

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Select your OAuth 2.0 Client ID**
3. **Check "Authorized JavaScript origins":**
   - Must include: `https://bulk-gpt-app.vercel.app`
   - Must include: `https://bulk-gpt-app-*.vercel.app` (for preview deployments)
   - Optional: `http://localhost:3000` (for local development)

4. **Check "Authorized redirect URIs":**
   - For Google Picker API, you typically need:
     - `https://bulk-gpt-app.vercel.app`
     - `http://localhost:3000` (for local dev)
   - **Note:** Google Picker API uses popup windows, so redirect URIs may not be strictly required, but origins MUST be set

### 🔑 Step 3: Verify OAuth Consent Screen

1. **Go to:** https://console.cloud.google.com/apis/credentials/consent
2. **Check:**
   - App is published OR you're added as a test user
   - Scopes include:
     - `https://www.googleapis.com/auth/spreadsheets.readonly`
     - `https://www.googleapis.com/auth/drive.readonly`

### 🧪 Step 4: Test Locally First

Test the integration locally to see more detailed error messages:

1. **Set up local `.env.local`:**
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key
GOOGLE_CLIENT_SECRET=your_client_secret
```

2. **Run locally:**
```bash
npm run dev
```

3. **Open browser console** to see detailed error messages

### 🐛 Common Issues and Fixes

#### Issue 1: "redirect_uri_mismatch"
**Cause:** Your Vercel URL is not in Authorized JavaScript origins  
**Fix:** Add `https://bulk-gpt-app.vercel.app` to Authorized JavaScript origins

#### Issue 2: "access_denied"
**Cause:** User cancelled the OAuth consent dialog  
**Fix:** This is expected if user clicks "Cancel". Check if consent screen is properly configured.

#### Issue 3: "invalid_client"
**Cause:** Client ID or Client Secret is incorrect  
**Fix:** Verify environment variables match Google Cloud Console exactly

#### Issue 4: "Scripts not loading"
**Cause:** Network issues or Content Security Policy blocking Google APIs  
**Fix:** Check browser console for blocked requests

### 🔍 Debugging Steps

1. **Check browser console** for detailed error messages
2. **Check Network tab** for failed API requests
3. **Verify scripts are loading:**
   - Open browser console
   - Type: `window.gapi` - should return object
   - Type: `window.google.picker` - should return object

4. **Check authentication state:**
   - After clicking "Import from Google Sheets"
   - Check if OAuth popup opens
   - Check if user can sign in
   - Check if consent screen appears

### 📋 Quick Checklist

- [ ] Environment variables set in Vercel (all 3: CLIENT_ID, API_KEY, CLIENT_SECRET)
- [ ] Authorized JavaScript origins includes production URL
- [ ] OAuth consent screen is configured
- [ ] Required scopes are added
- [ ] Test user added (if app not published)
- [ ] Google Sheets API is enabled
- [ ] Google Drive API is enabled (for Picker)

### 🚀 Production Deployment Checklist

For production deployment:

1. **Add production URL to Authorized JavaScript origins:**
   ```
   https://bulk-gpt-app.vercel.app
   ```

2. **Add preview URLs (optional but recommended):**
   ```
   https://bulk-gpt-app-*.vercel.app
   ```

3. **Verify OAuth consent screen:**
   - App name is set
   - Support email is set
   - Scopes are configured
   - App is published OR test users are added

4. **Verify APIs are enabled:**
   - Google Sheets API
   - Google Drive API

### 🔗 Useful Links

- [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
- [Google Cloud Console - OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [Google Picker API Documentation](https://developers.google.com/picker)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

### 💡 Still Not Working?

If you've checked everything above and it's still not working:

1. **Check Vercel deployment logs:**
   ```bash
   vercel logs --follow
   ```

2. **Check browser console** for specific error messages

3. **Try incognito mode** to rule out browser extensions blocking OAuth

4. **Verify the Client ID format:**
   - Should look like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`

5. **Check if there are any Content Security Policy headers** blocking Google APIs














