# Testing Unified Context Form

## ✅ Migration Complete!

You've run the unified migration. Now let's test everything works.

---

## 🧪 Testing Checklist

### 1. **Test Basic Form Load**
- [ ] Go to **Context → Business Context** tab
- [ ] Form should load without errors
- [ ] No console errors in browser dev tools

### 2. **Test Context Variables (Auto-save)**
- [ ] Fill in **Tone**: "Professional"
- [ ] Fill in **Product Description**: "AI-powered CRM"
- [ ] Fill in **Competitors**: "Salesforce, HubSpot"
- [ ] Fill in **Target Industries**: "SaaS, Technology"
- [ ] Fill in **Compliance Flags**: "SOC2, GDPR"
- [ ] **Expected:** "Auto-saved" indicator appears
- [ ] Refresh page → **Expected:** Values persist

### 3. **Test Business Context Fields**
- [ ] Fill in **ICP**: "B2B SaaS companies with 50-500 employees"
- [ ] Add **Countries**: "United States", "United Kingdom"
- [ ] Add **Products**: "CRM", "Marketing Automation"
- [ ] Add **Target Keywords**: "crm software", "marketing automation"
- [ ] Add **Competitor Keywords**: "salesforce", "hubspot"
- [ ] **Expected:** Auto-saves, values persist on refresh

### 4. **Test GTM Auto-Classification**
- [ ] Fill in ICP and Products (if not already filled)
- [ ] Wait 2-3 seconds after saving
- [ ] **Expected:** GTM playbook and product type should auto-populate
- [ ] Check browser console for any errors

### 5. **Test Manual GTM Classification**
- [ ] Click **"Analyse"** button in GTM Classification section
- [ ] **Expected:** 
  - Shows "Analysing..." state
  - Returns suggestions with confidence badges
  - Can click "Why?" to see reasoning
- [ ] Select a playbook manually
- [ ] Select a product type manually
- [ ] **Expected:** Values save and persist

### 6. **Test Website Analysis**
- [ ] Enter a website URL (e.g., "stripe.com")
- [ ] Click **"Analyze"** button
- [ ] **Expected:**
  - Shows "Analyzing..." state
  - Extracts context variables
  - Auto-populates form fields
  - Toast notification: "Website analyzed successfully"

### 7. **Test Clear All**
- [ ] Click **"Clear All"** button
- [ ] Confirm in modal
- [ ] **Expected:**
  - All context variables cleared
  - All business context cleared
  - GTM profile preserved (not cleared)
  - Toast: "Context cleared"

### 8. **Test Database Persistence**
- [ ] Fill in some fields
- [ ] Wait for auto-save
- [ ] Check Supabase Dashboard → `business_contexts` table
- [ ] **Expected:** Data is saved with correct structure

---

## 🐛 Troubleshooting

### Form doesn't load
- **Check:** Browser console for errors
- **Check:** Network tab for API errors
- **Check:** Supabase connection (is migration applied?)

### Auto-save not working
- **Check:** Browser console for errors
- **Check:** Network tab → `/api/business-context/business-context` requests
- **Check:** Supabase RLS policies (should allow user to update own context)

### GTM classification not working
- **Check:** Is `GEMINI_API_KEY` or `NEXT_PUBLIC_GOOGLE_API_KEY` set?
- **Check:** Browser console for API errors
- **Check:** Network tab → `/api/business-context/classify-gtm` requests

### Data not persisting
- **Check:** Supabase Dashboard → `business_contexts` table
- **Check:** User ID matches `auth.uid()`
- **Check:** RLS policies allow SELECT/UPDATE

---

## ✅ Success Criteria

Everything works when:
- ✅ Form loads without errors
- ✅ All fields auto-save
- ✅ Data persists after refresh
- ✅ GTM auto-classifies when ICP/products are filled
- ✅ "Analyse" button works
- ✅ Website analysis works
- ✅ Clear All works (preserves GTM)

---

## 🎯 Next Steps After Testing

1. **If everything works:** You're done! 🎉
2. **If issues found:** Check console/network errors and fix
3. **Optional cleanup:** Can delete `BusinessContextForm.tsx` if not needed elsewhere

---

## 📋 Quick Test Commands

### Check API Route Works
```bash
# In browser console (on Context page):
fetch('/api/business-context/business-context')
  .then(r => r.json())
  .then(console.log)
```

### Check Database Schema
```sql
-- Run in Supabase SQL Editor:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_contexts' 
ORDER BY column_name;
```

---

**Ready to test!** 🚀

