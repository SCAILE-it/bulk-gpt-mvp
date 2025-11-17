# Testing Cursor Simple Browser Preview

## ✅ Setup Status
- Dev server: Running on port 3000
- Configuration files: Created
- Simple Browser: Ready to use

## 🧪 Test Steps

### Test 1: Open Simple Browser via Command Palette
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Simple Browser: Show`
3. If it appears, select it
4. Enter URL: `http://localhost:3000`
5. ✅ **Expected**: Browser opens showing your app

### Test 2: Use Keyboard Shortcut
1. Press `Cmd+Shift+L` (Mac) or `Ctrl+Shift+L` (Windows/Linux)
2. ✅ **Expected**: Simple Browser opens with `http://localhost:3000` pre-filled

### Test 3: Verify Configuration
Check that these settings are active:
- Simple Browser should default to `http://localhost:3000`
- Preview mode should be enabled

## 🔍 Troubleshooting

If Simple Browser doesn't appear:
1. **Reload Cursor**: `Cmd+Shift+P` → "Developer: Reload Window"
2. **Check Extensions**: Simple Browser is built-in, but verify it's enabled
3. **Manual URL**: Try opening `http://localhost:3000` directly in Simple Browser

## 📝 Notes
- Make sure dev server is running: `npm run dev`
- Simple Browser opens in a new editor tab
- You can have multiple Simple Browser tabs open


