# Manual Tab Testing Checklist

Use this checklist to manually verify all tabs work correctly.

## Test Procedure

1. Navigate to each page
2. Click through all tabs
3. Check browser console for errors
4. Verify content loads correctly
5. Mark as ✅ or ❌

---

## ✅ Context Page (`/context`)

- [ ] **Business Context** tab (default)
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Form fields visible

- [ ] **Files** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] File upload UI visible

- [ ] **Integrations** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Integrations list visible

- [ ] **Business Context** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Business context form visible

---

## ✅ Resources Page (`/resources`)

- [ ] **Leads** tab (default)
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Resources list visible

- [ ] **Keywords** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Keywords list visible

- [ ] **Content** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Content list visible

- [ ] **Campaigns** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Campaigns list visible

---

## ✅ Analytics/Output Page (`/output`)

- [ ] **Analytics** tab (default)
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Charts/dashboard visible

- [ ] **Executions** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Batches table visible

---

## ✅ Profile Page (`/profile`)

- [ ] **Account** tab (default)
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Profile form visible

- [ ] **API Keys** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] API keys list visible

- [ ] **Usage** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Usage display visible

- [ ] **Billing** tab ⭐ NEW
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Invoice list visible (or empty state)

---

## ✅ Home Page (`/home`)

- [ ] **Overview** tab
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Dashboard content visible

---

## ✅ Agents Page (`/agents`)

- [ ] No tabs (single view)
  - [ ] Content loads
  - [ ] No console errors
  - [ ] Agents list visible

---

## Common Issues to Check

- [ ] No React warnings in console
- [ ] No 500 errors in network tab
- [ ] Tabs switch smoothly without page reload
- [ ] Tab content doesn't flash/disappear
- [ ] Active tab is visually highlighted
- [ ] All icons render correctly
- [ ] Responsive design works on mobile

---

## Notes

- Test with browser dev tools open (F12)
- Check both Network and Console tabs
- Test on different screen sizes if possible
- Verify authentication is working (user logged in)

