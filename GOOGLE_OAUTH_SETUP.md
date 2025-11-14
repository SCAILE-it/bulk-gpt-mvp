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

**CRITICAL:** The Google Picker API must be enabled for the Picker to work!

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (`gtm-dashboard-launch`)
3. Navigate to: **APIs & Services** → **Library**
4. Search for and enable:
   - **Google Picker API** (REQUIRED for Picker to open)
   - **Google Drive API** (if not already enabled)
   - **Google Sheets API** (if not already enabled)

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

If you're still getting `redirect_uri_mismatch` error:

1. **Check the exact redirect URI being sent:**
   - When the error page appears, look at the URL in the browser address bar
   - The URL will contain a `redirect_uri` parameter
   - Copy that EXACT value (it will be URL-encoded)

2. **Add the exact redirect URI to Google Cloud Console:**
   - Go to your OAuth 2.0 Client ID settings
   - Under "Authorized redirect URIs", add the EXACT URI from step 1
   - Make sure it matches character-for-character (including encoding)

3. **Common redirect URIs for GSI:**
   - `https://bulk-gpt.com` (most common - just origin)
   - `https://www.bulk-gpt.com` (if using www subdomain)
   - `https://bulk-gpt-app.vercel.app` (for Vercel preview deployments)

4. **Wait for propagation:**
   - Changes can take 5-10 minutes to propagate
   - Clear browser cache/cookies
   - Try again

## Testing

After updating the configuration:
1. Wait 5-10 minutes for changes to propagate
2. Clear browser cache/cookies (or use incognito mode)
3. Try "Pick from Drive" button again
4. The OAuth popup should work without `redirect_uri_mismatch` error

