# Google OAuth Setup for bulk-gpt.com

## Required Configuration in Google Cloud Console

### For Google Identity Services (GSI) - Used for Google Picker and Sheets Export

**Important:** Google Identity Services uses **Authorized JavaScript origins**, NOT redirect URIs.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with OAuth client ID `466128555451-uobrlom0thvcnfkniaacre1gbajpevpf`)
3. Navigate to: **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized JavaScript origins**, add:
   - `https://bulk-gpt.com`
   - `https://www.bulk-gpt.com`
   - `https://bulk-gpt-app.vercel.app` (for Vercel deployments)
   - `http://localhost:3000` (for local development)

6. Under **Authorized redirect URIs** (if shown), you can leave empty OR add:
   - `https://bulk-gpt.com`
   - `https://www.bulk-gpt.com`
   - `http://localhost:3000` (for local development)

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

## Testing

After updating the configuration:
1. Wait 5-10 minutes for changes to propagate
2. Clear browser cache/cookies
3. Try "Pick from Drive" button again
4. The OAuth popup should work without `redirect_uri_mismatch` error

