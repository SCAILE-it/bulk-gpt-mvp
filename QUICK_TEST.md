# Quick Test Guide

## ✅ Migration Applied - Now Test!

### Step 1: Start Your Dev Server
```bash
npm run dev
# or
yarn dev
```

### Step 2: Open the App
1. Go to `http://localhost:3000` (or your dev URL)
2. Log in if needed
3. Navigate to **Context → Business Context** tab

### Step 3: Quick Test
1. **Fill in ICP:**
   - Type: "B2B SaaS companies with 50-500 employees"

2. **Add a Country:**
   - Type "United States" and press Enter or click +

3. **Add a Product:**
   - Type "CRM" and press Enter or click +

4. **Check Auto-Save:**
   - Look for "Auto-saved" indicator (green checkmark)
   - Refresh page → values should persist

5. **Test GTM Auto-Classification:**
   - After filling ICP + country + product
   - Wait 2-3 seconds
   - Check if GTM playbook/product type appear automatically

6. **Test Manual Classification:**
   - Click **"Analyse"** button in GTM section
   - Should show suggestions with confidence badges

---

## 🐛 If Something Doesn't Work

### Form doesn't load?
- Open browser console (F12)
- Check for errors
- Look for red error messages

### Auto-save not working?
- Open Network tab (F12 → Network)
- Look for `/api/business-context/business-context` requests
- Check if they return 200 OK or show errors

### GTM classification not working?
- Check browser console for errors
- Verify API key is set: `NEXT_PUBLIC_GOOGLE_API_KEY` or `GEMINI_API_KEY`
- Check Network tab for `/api/business-context/classify-gtm` requests

### Data not saving?
- Check Supabase Dashboard → `business_contexts` table
- Verify your user_id matches
- Check RLS policies allow your user to INSERT/UPDATE

---

## ✅ Success Looks Like

- Form loads without errors
- Fields auto-save (green checkmark appears)
- Data persists after refresh
- GTM auto-classifies OR "Analyse" button works
- No console errors

---

## 📞 Need Help?

Check these files:
- `TESTING_UNIFIED_FORM.md` - Full testing checklist
- Browser console - Shows JavaScript errors
- Network tab - Shows API request/response errors
- Supabase Dashboard - Shows database state

