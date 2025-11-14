# Google Picker Minimal Test

## How to Use

1. Open `test-google-picker-minimal.html` in your browser (double-click or open via file://)
2. Click buttons in order:
   - **1. Load Google Scripts** - Loads Google Identity Services and Picker API
   - **2. Check Status** - Shows what's available
   - **3. Get OAuth Token** - Opens OAuth popup to get access token
   - **4. Open Picker** - Attempts to open Google Picker

## What to Look For

- **If Step 1 fails**: Script loading issue (CSP, network, etc.)
- **If Step 2 shows APIs missing**: Google Picker API not enabled in Google Cloud Console
- **If Step 3 fails**: OAuth configuration issue
- **If Step 4 fails**: Picker API issue or pop-up blocker

## Expected Behavior

After clicking "4. Open Picker", you should see:
- "✓ setVisible(true) called successfully"
- A Google Picker dialog should appear
- When you select a file, callback fires with document info

## If Picker Doesn't Open

Check browser console (F12) for:
- CSP errors
- Network errors
- JavaScript errors
- Pop-up blocker messages

## Common Issues

1. **"Google Picker API not available"** → Enable Google Picker API in Google Cloud Console
2. **"Pop-ups blocked"** → Allow pop-ups for this page
3. **"Invalid or expired access token"** → Re-authenticate (Step 3)
4. **No error but picker doesn't open** → Check browser console for CSP or network errors
