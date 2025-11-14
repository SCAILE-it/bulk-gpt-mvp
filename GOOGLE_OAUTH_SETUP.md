# Google OAuth Setup for bulk-gpt.com

## Required Configuration in Google Cloud Console

### For Google Identity Services (GSI) - Used for Google Picker and Sheets Export

**Important:** Google Identity Services requires BOTH **Authorized JavaScript origins** AND **Authorized redirect URIs**.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with OAuth client ID `466128555451-uobrlom0thvcnfkniaacre1gbajpevpf`)
3. Navigate to: **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID (`466128555451-uobrlom0thvcnfkniaacre1gbajpevpf`)
5. Under **Authorized JavaScript origins**, add (one per line):
   ```
   https://bulk-gpt.com
   https://www.bulk-gpt.com
   https://bulk-gpt-app.vercel.app
   http://localhost:3000
   http://localhost:8000
   http://127.0.0.1:8000
   ```

6. Under **Authorized redirect URIs**, add (one per line):
   ```
   https://bulk-gpt.com
   https://www.bulk-gpt.com
   https://bulk-gpt-app.vercel.app
   http://localhost:3000
   http://localhost:8000
   http://127.0.0.1:8000
   ```
   
   **Note:** For GSI popup flow, the redirect URI is typically just the origin (no path). Make sure there are NO trailing slashes and NO paths.

### Enable Required APIs

**CRITICAL:** The following APIs MUST be enabled for Google Sheets export to work!

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (`466128555451` - the project with your OAuth client ID)
3. Navigate to: **APIs & Services** → **Library**
4. Search for and enable (click "Enable" for each):
   - **Google Drive API** (REQUIRED for creating Google Sheets via Drive API)
     - Direct link: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=466128555451
   - **Google Picker API** (REQUIRED for Picker to open)
     - Direct link: https://console.developers.google.com/apis/api/picker.googleapis.com/overview?project=466128555451
   - **Google Sheets API** (optional, but recommended for reading sheets)
     - Direct link: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=466128555451

**Note:** After enabling APIs, wait 2-5 minutes for changes to propagate before testing.

### OAuth Consent Screen

- **App name:** Bulk GPT
- **User support email:** Your email
- **Developer contact:** Your email
- **App domain:** `bulk-gpt.com`
- **Authorized domains:** `bulk-gpt.com`, `vercel.app`
- **Scopes:** `https://www.googleapis.com/auth/drive.file` (non-restricted, no verification needed)

### Current Client ID

- **Client ID:** `466128555451-uobrlom0thvcnfkniaacre1gbajpevpf.apps.googleusercontent.com`
- **Project:** `gtm-dashboard-launch` (or your project name)

## Troubleshooting redirect_uri_mismatch Error

**IMPORTANT:** Google Identity Services (GSI) uses `storagerelay://` redirect URIs for popup flows. These are special protocol handlers that **CANNOT** be added to Google Cloud Console. The error usually indicates an OAuth consent screen configuration issue.

### Fix Steps:

1. **Verify OAuth Consent Screen Configuration:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to: **APIs & Services** → **OAuth consent screen**
   - Ensure the app is **Published** (not in "Testing" mode)
   - Under **App domain**, ensure `bulk-gpt.com` is listed
   - Under **Authorized domains**, ensure `bulk-gpt.com` and `vercel.app` are listed

2. **Check Authorized JavaScript Origins:**
   - Go to **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID
   - Under **Authorized JavaScript origins**, ensure these are listed (NO trailing slashes):
     ```
     https://bulk-gpt.com
     https://www.bulk-gpt.com
     https://bulk-gpt-app.vercel.app
     http://localhost:3000
     ```

3. **For Authorized Redirect URIs (GSI popup flows):**
   - GSI popup flows use `storagerelay://` which cannot be configured
   - However, you should still have these origins listed (without paths):
     ```
     https://bulk-gpt.com
     https://www.bulk-gpt.com
     https://bulk-gpt-app.vercel.app
     http://localhost:3000
     ```
   - **Important:** Do NOT add `storagerelay://` URIs - GSI handles these automatically

4. **If still getting errors:**
   - Clear browser cache/cookies (or use incognito mode)
   - Wait 5-10 minutes for changes to propagate
   - Try again

### Common Issues:

- **"App doesn't comply with OAuth 2.0 policy"**: OAuth consent screen is not published or configured incorrectly
- **"redirect_uri_mismatch"**: Authorized JavaScript origins or redirect URIs are missing or incorrect
- **"Access blocked"**: App is still in "Testing" mode - publish it to production

## Testing

After updating the configuration:
1. Wait 5-10 minutes for changes to propagate
2. Clear browser cache/cookies (or use incognito mode)
3. Try "Pick from Drive" button again
4. The OAuth popup should work without `redirect_uri_mismatch` error
