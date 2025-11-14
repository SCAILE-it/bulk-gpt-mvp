# Check Vercel Environment Variables

The Google Picker button isn't showing because the Client ID environment variable might not be set in Vercel.

## Required Environment Variable

**Variable Name:** `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`  
**Value:** `466128555451-uobrlom0thvcnfkniaacre1gbajpevpf.apps.googleusercontent.com`

## To Set in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` = `466128555451-uobrlom0thvcnfkniaacre1gbajpevpf.apps.googleusercontent.com`
3. Make sure it's set for **Production** environment
4. Redeploy

## Verify:

After setting, the "Pick from Google Drive" button should appear in the Google Sheets tab.
