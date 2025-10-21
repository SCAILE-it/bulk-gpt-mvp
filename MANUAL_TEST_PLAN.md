# 🧪 Manual Test Plan - Wizard Quality Check

**Tester**: You (or me guiding you)
**Time Estimate**: 15 minutes
**Goal**: Verify core functionality works before polish

---

## ✅ **Pre-Test Setup**

1. **Dev Server Running?**
   ```bash
   # Check if running
   curl -I http://localhost:3000

   # If not, start it
   npm run dev
   ```

2. **Open Browser**
   ```
   http://localhost:3000/wizard
   ```

3. **Prepare Test CSV**
   Create `test.csv`:
   ```csv
   name,company,role
   Alice Johnson,Acme Inc,Engineer
   Bob Smith,Beta Corp,Manager
   Carol White,Gamma LLC,Designer
   ```

---

## 🧪 **Test Sequence**

### **Test 1: Authentication** ✓/✗

**Steps:**
1. Navigate to `http://localhost:3000/wizard`
2. Should redirect to `/auth`
3. Sign in with: `test@example.com` / `password`
4. Should redirect back to `/wizard`

**Expected:**
- ✓ Redirect to auth happens
- ✓ Login form visible
- ✓ After login, back to wizard

**Actual:**
- [ ] Pass / [ ] Fail
- Notes: _________________________

---

### **Test 2: Step 1 - Upload State** ✓/✗

**Check these UI elements:**
- [ ] Page title: "Bulk GPT - Wizard" or similar
- [ ] Step navigation visible (1 → 2 → 3)
- [ ] Step 1 is active/highlighted
- [ ] Large upload dropzone visible
- [ ] Text: "Upload CSV File"
- [ ] Text: "Drop file here or click to browse"
- [ ] Text: "Max 50MB • 10,000 rows"
- [ ] "Choose File" button visible

**Screenshot**: ___ (take screenshot)

---

### **Test 3: Step 1 - File Upload** ✓/✗

**Steps:**
1. Click "Choose File" button
2. Select `test.csv`
3. Wait for file to upload

**Expected Transformation:**
- [ ] Upload dropzone **disappears**
- [ ] File info appears: "✓ test.csv"
- [ ] Row/column count: "3 rows • 3 columns"
- [ ] Preview section appears
- [ ] Preview shows: "Preview (first 5 rows):"
- [ ] Table with headers: name, company, role
- [ ] Table with 3 data rows
- [ ] Two buttons visible: "Upload Different" + "Continue →"

**Actual:**
- [ ] Pass / [ ] Fail
- Issues: _________________________

**Screenshot**: ___ (take screenshot)

---

### **Test 4: Step 1 - Upload Different** ✓/✗

**Steps:**
1. Click "Upload Different" button

**Expected:**
- [ ] Preview disappears
- [ ] Upload dropzone reappears
- [ ] Can upload a new file

**Actual:**
- [ ] Pass / [ ] Fail

---

### **Test 5: Step 1 → Step 2 Navigation** ✓/✗

**Steps:**
1. Re-upload `test.csv` (or continue from Test 3)
2. Click "Continue →" button

**Expected:**
- [ ] Navigate to Step 2
- [ ] Step 2 in navigation highlighted
- [ ] URL doesn't change (same `/wizard` page)

**Actual:**
- [ ] Pass / [ ] Fail

---

### **Test 6: Step 2 - Configure UI** ✓/✗

**Check these elements:**
- [ ] CSV filename displayed: "test.csv"
- [ ] Row count displayed: "3 rows"
- [ ] Label: "Write your prompt:"
- [ ] **Large textarea** for prompt (main focus)
- [ ] Label: "Columns:" with clickable pills
- [ ] Three pills visible: [name] [company] [role]
- [ ] Separator line (hr)
- [ ] Label: "Processing mode:"
- [ ] **Segmented control** with two options:
  - [ ] "Test (3 rows)" - left side
  - [ ] "Full (3 rows)" - right side
- [ ] "Test" is selected by default (highlighted)
- [ ] Text: "⌄ Advanced Options (click to expand)"
- [ ] Advanced section is **collapsed** (hidden)
- [ ] Two buttons: "← Back" + "Start Processing →"

**Screenshot**: ___ (take screenshot)

---

### **Test 7: Step 2 - Column Variable Insertion** ✓/✗

**Steps:**
1. Click in the prompt textarea
2. Click the [name] pill

**Expected:**
- [ ] "{{name}}" inserted at cursor position
- [ ] Cursor moves after the inserted text

**Repeat for [company] and [role]**

**Actual:**
- [ ] Pass / [ ] Fail
- Issues: _________________________

---

### **Test 8: Step 2 - Processing Mode Toggle** ✓/✗

**Steps:**
1. Click "Full (3 rows)" button

**Expected:**
- [ ] "Full" becomes highlighted/active
- [ ] "Test" becomes unhighlighted/inactive
- [ ] Visual feedback (color change, shadow)

**Click "Test (3 rows)" again**

**Expected:**
- [ ] Switches back to Test mode

**Actual:**
- [ ] Pass / [ ] Fail

---

### **Test 9: Step 2 - Advanced Options** ✓/✗

**Steps:**
1. Click "⌄ Advanced Options (click to expand)"

**Expected:**
- [ ] Arrow changes to "⌃" (pointing up)
- [ ] Text changes: "Advanced Options (click to collapse)"
- [ ] Card section slides in/fades in
- [ ] Shows:
  - [ ] Label: "Context (optional):"
  - [ ] Small textarea for context
  - [ ] Label: "Output Columns (optional):"
  - [ ] Text: "Define specific fields... If empty, AI will auto-generate..."
  - [ ] Input field + [+] button

**Click again to collapse**

**Expected:**
- [ ] Card section disappears (slides out/fades out)
- [ ] Arrow points down again

**Actual:**
- [ ] Pass / [ ] Fail
- Issues: _________________________

**Screenshot**: ___ (collapsed and expanded)

---

### **Test 10: Step 2 - Output Columns** ✓/✗

**Steps:**
1. Expand Advanced Options
2. Type "summary" in output columns input
3. Click [+] button

**Expected:**
- [ ] Pill appears: "summary" with [x] button
- [ ] Input clears

**Add another: "sentiment"**

**Expected:**
- [ ] Two pills visible: "summary" and "sentiment"

**Click [x] on "summary"**

**Expected:**
- [ ] "summary" pill disappears
- [ ] Only "sentiment" remains

**Actual:**
- [ ] Pass / [ ] Fail

---

### **Test 11: Step 2 - Validation** ✓/✗

**Steps:**
1. Clear the prompt textarea (delete all text)
2. Click "Start Processing →"

**Expected:**
- [ ] Error message appears: "Prompt template is required"
- [ ] Does NOT navigate to Step 3

**Add prompt without variables: "Hello world"**
**Click "Start Processing →"**

**Expected:**
- [ ] Error: "Prompt must contain at least one variable"

**Add valid prompt: "Write a bio for {{name}} at {{company}}"**
**Click "Start Processing →"**

**Expected:**
- [ ] No error
- [ ] Proceeds to Step 3

**Actual:**
- [ ] Pass / [ ] Fail
- Issues: _________________________

---

### **Test 12: Step 2 → Step 1 Back Navigation** ✓/✗

**Steps:**
1. Click "← Back" button

**Expected:**
- [ ] Returns to Step 1
- [ ] CSV file still loaded (preview visible)
- [ ] Can click "Continue →" to go back to Step 2
- [ ] Prompt is preserved (not lost)

**Actual:**
- [ ] Pass / [ ] Fail

---

### **Test 13: Step 3 - Processing** ✓/✗

**Steps:**
1. Navigate to Step 2 (if not there)
2. Enter prompt: "Write a bio for {{name}}"
3. Select "Test (3 rows)"
4. Click "Start Processing →"

**Expected:**
- [ ] Navigate to Step 3
- [ ] Processing indicator visible
- [ ] Progress updates in real-time
- [ ] Results appear row by row

**Actual:**
- [ ] Pass / [ ] Fail
- Issues: _________________________

**Screenshot**: ___ (during processing)

---

## 📊 **Test Summary**

**Tests Passed**: ___ / 13
**Tests Failed**: ___ / 13

**Critical Issues:**
1. ___________________________
2. ___________________________
3. ___________________________

**Minor Issues:**
1. ___________________________
2. ___________________________

**Overall Assessment**:
- [ ] ✅ Ready for polish (no critical bugs)
- [ ] ⚠️ Needs bug fixes first
- [ ] ❌ Major rework needed

---

## 🎯 **Next Steps Based on Results**

**If all tests pass (or only minor issues):**
→ Proceed to Phase 2: UI/UX Polish

**If 1-3 tests fail:**
→ Fix bugs first, then retest

**If 4+ tests fail:**
→ Review implementation, may need adjustments

---

## 💬 **Report Format**

**After testing, provide:**
```
✅ PASSED: Tests 1, 2, 3, 5, 6, 8, 9, 10, 12
❌ FAILED: Tests 4, 7, 11, 13

Critical Bugs:
- Test 7: Column pills don't insert variables
- Test 11: Validation doesn't work

Minor Issues:
- Test 4: Upload Different button styling off
- Test 9: Animation jerky
```

**Then I can fix issues systematically!**
