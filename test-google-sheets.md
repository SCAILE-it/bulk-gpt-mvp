# Google Sheets Integration Test Checklist

## ✅ Pre-Test Verification

1. **Environment Variables Set in Vercel:**
   - ✅ `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - ✅ `NEXT_PUBLIC_GOOGLE_API_KEY`
   - ✅ `GOOGLE_CLIENT_SECRET`

2. **Google Cloud Console Configuration:**
   - ✅ Authorized JavaScript origins includes: `https://bulk-gpt-app.vercel.app`
   - ✅ OAuth consent screen configured
   - ✅ Required scopes added
   - ✅ APIs enabled (Sheets API, Drive API)

## 🧪 Manual Test Steps

### Step 1: Navigate to Bulk Processing Page
1. Go to: https://bulk-gpt-app.vercel.app
2. Log in with: `test@bulkgpt.local` / `Test123456!`
3. Navigate to `/bulk` page

### Step 2: Open Google Sheets Tab
1. In the "Input" section, you should see tabs: "CSV Upload" and "Google Sheets"
2. Click on the **"Google Sheets"** tab

### Step 3: Test Google Sheets Import
1. Click the **"Import from Google Sheets"** button
2. **Expected behavior:**
   - Google OAuth popup should open
   - You should be able to sign in with your Google account
   - After signing in, Google Picker should open
   - You should see your Google Sheets listed
   - You can select a sheet

### Step 4: Verify Data Import
1. After selecting a sheet, the data should appear in the preview table
2. You should see:
   - Sheet name displayed
   - Row count and column count
   - Preview of first 5 rows
   - Column checkboxes for selecting input columns

## 🐛 What to Check if It Fails

### Browser Console Errors
Open browser console (F12) and check for:
- `redirect_uri_mismatch` → JavaScript origins not set correctly
- `access_denied` → User cancelled or consent screen issue
- `invalid_client` → Client ID mismatch
- Script loading errors → Network/CSP issues

### Network Tab
Check Network tab for:
- Failed requests to `apis.google.com`
- Failed requests to `accounts.google.com`
- CORS errors

### Common Issues

1. **"Google API scripts not loaded"**
   - Check if scripts are blocked by ad blocker
   - Check browser console for blocked requests
   - Try incognito mode

2. **"Google authentication cancelled or failed"**
   - Verify JavaScript origins in Google Cloud Console
   - Check OAuth consent screen configuration
   - Verify you're added as test user (if app not published)

3. **Picker doesn't open**
   - Check if popup was blocked
   - Check browser console for errors
   - Verify Drive API is enabled

## ✅ Success Criteria

The integration is working if:
- ✅ OAuth popup opens and you can sign in
- ✅ Google Picker opens showing your sheets
- ✅ You can select a sheet
- ✅ Sheet data appears in preview table
- ✅ You can proceed with processing

## 📝 Test Results

**Date:** _______________
**Tester:** _______________
**Result:** [ ] Pass [ ] Fail

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________









