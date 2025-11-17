# E2E Testing Status - Context Features

## ✅ Test Files Created

### 1. `context-page-website-analysis.spec.ts` (Existing)
- ✅ Tests website analysis functionality
- ✅ Tests manual context entry
- ✅ Tests context persistence
- ✅ Tests Clear All confirmation
- ✅ Tests navigation to Bulk Agent

### 2. `context-features-complete-e2e.spec.ts` (New - Comprehensive)
- ✅ Tests all 3 tabs (Business Context, Files, Integrations)
- ✅ Tests file upload functionality
- ✅ Tests integrations connection (HubSpot)
- ✅ Tests integrations sync
- ✅ Tests context variables in Bulk Agent
- ✅ Tests tab navigation

## 🧪 Manual Testing Checklist

Since automated tests require dev server running, here's what to test manually:

### Business Context Tab
- [ ] Navigate to `/context` → Business Context tab
- [ ] Enter URL `scaile.tech` and click "Analyze"
- [ ] Verify fields populate with AI-extracted data
- [ ] Manually edit fields
- [ ] Verify values persist after page reload
- [ ] Click "Clear All" → verify confirmation dialog
- [ ] Confirm clearing → verify all fields cleared

### Files Tab
- [ ] Navigate to `/context` → Files tab
- [ ] Upload a CSV file (drag & drop or click)
- [ ] Verify file appears in list with correct name/size
- [ ] Upload a PDF/DOCX/XLSX file
- [ ] Verify all file types work
- [ ] Click delete (X button) on a file
- [ ] Verify file is removed from list

### Integrations Tab
- [ ] Navigate to `/context` → Integrations tab
- [ ] Click "Connect" on HubSpot
- [ ] Enter API key: `<your-hubspot-api-key>`
- [ ] Click "Connect" button
- [ ] Verify connection succeeds (green checkmark)
- [ ] Click "Sync" button
- [ ] Verify sync starts and completes
- [ ] Test Instantly and Phantombuster (if API keys work)

### Bulk Agent Integration
- [ ] Set context variables (tone, countries, etc.)
- [ ] Navigate to `/bulk`
- [ ] Upload a CSV file
- [ ] Write prompt using `{{context.tone}}`
- [ ] Verify `context.tone` shows as available variable (not missing)
- [ ] Add more context variables to prompt
- [ ] Verify all context variables are recognized
- [ ] Run a batch job
- [ ] Verify context is included in processing

### Tab Navigation
- [ ] Switch between Business Context/Files/Integrations tabs
- [ ] Verify content loads correctly for each tab
- [ ] Verify tab state persists (or resets appropriately)

## 🚀 Running Tests

### Prerequisites
1. Dev server running: `npm run dev` (on localhost:3000)
2. Or update Playwright config to use production URL

### Run All Context Tests
```bash
npx playwright test playwright-tests/context-features-complete-e2e.spec.ts
```

### Run Specific Test Suite
```bash
# Variables only
npx playwright test playwright-tests/context-features-complete-e2e.spec.ts -g "Context Variables"

# Files only
npx playwright test playwright-tests/context-features-complete-e2e.spec.ts -g "Files Tab"

# Integrations only
npx playwright test playwright-tests/context-features-complete-e2e.spec.ts -g "Integrations Tab"
```

## 📊 Test Coverage

### ✅ Covered by Tests
- Website analysis flow
- Manual context entry
- Context persistence (localStorage)
- Clear All confirmation
- File upload UI
- File deletion
- Integration connection flow
- Integration sync
- Tab navigation
- Context variables in Bulk Agent

### ⚠️ Needs Manual Verification
- Actual file upload to Supabase storage
- File download/retrieval
- Integration data sync (actual API calls)
- Error handling for invalid API keys
- Error handling for network failures
- Large file uploads (>10MB)
- Multiple file uploads simultaneously

## 🐛 Known Issues to Test

1. **File Upload**: Verify files actually upload to Supabase storage bucket
2. **Integration Sync**: Verify HubSpot API calls work with real key
3. **Context Variables**: Verify they're passed to batch processing API
4. **Error States**: Test with invalid URLs, API keys, file types

## 📝 Test Results

Run tests and update this section with results:

```
Date: [Date]
Tester: [Name]
Results:
- Business Context Tab: ✅/❌
- Files Tab: ✅/❌
- Integrations Tab: ✅/❌
- Bulk Agent Integration: ✅/❌
- Tab Navigation: ✅/❌

Issues Found:
- [List any issues]
```

