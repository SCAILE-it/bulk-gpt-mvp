# UX Issues Tracking - Complete List
**Date:** October 23, 2025
**Status:** Verification in Progress
**Total Issues:** 28 (20 from audit + 8 new)

## 🔴 P0 - CRITICAL (Must Fix Before ANY Launch)

### 1. Beta Banner Blocks Critical Information
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #1
**Status:** ❓ NEEDS VERIFICATION
**Impact:** Every user, every session

**Problem:**
- Banner takes 40px of vertical space
- Permanently visible (close button doesn't work)
- No localStorage dismissal
- Obscures workflow on smaller screens

**Fix Required:**
```typescript
const [dismissed, setDismissed] = useState(() =>
  localStorage.getItem('beta-banner-dismissed') === 'true'
)

const dismiss = () => {
  localStorage.setItem('beta-banner-dismissed', 'true')
  setDismissed(true)
}

{!dismissed && <BetaBanner onDismiss={dismiss} />}
```

**Effort:** 10 minutes
**Screenshot:** test-reports/verification/p0-1-beta-banner.png

---

### 2. Prompt Textarea Too Small for Real Prompts
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #2
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 90% of users with complex prompts

**Problem:**
- min-height: 120px shows only ~6 lines
- Real prompts are often 10-20 lines
- Forces constant scrolling within textarea
- Can't see full prompt context while editing

**Current:** 120px
**Required:** 180px minimum OR auto-expand

**Fix Required:**
```typescript
// Option 1: Larger min-height
min-height: 180px

// Option 2: Auto-expand (better)
<AutoExpandTextarea
  minHeight={120}
  maxHeight={400}
  value={prompt}
/>
```

**Effort:** 15 minutes
**Screenshot:** test-reports/verification/p0-2-prompt-textarea.png

---

### 3. No Loading State During CSV Parse
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #3
**Status:** ❓ NEEDS VERIFICATION
**Impact:** Users with large files (>1MB)

**Problem:**
- Upload triggers, no feedback
- Large CSV takes 2-5 seconds to parse
- User thinks app is frozen
- May click multiple times (duplicate uploads)

**Fix Required:**
```typescript
const [isUploading, setIsUploading] = useState(false)

const handleUpload = async (file) => {
  setIsUploading(true)
  try {
    await parseCSV(file)
  } finally {
    setIsUploading(false)
  }
}

{isUploading && (
  <div className="flex items-center gap-2">
    <Loader2 className="animate-spin" />
    <span>Parsing CSV...</span>
  </div>
)}
```

**Effort:** 20 minutes
**Screenshot:** test-reports/verification/p0-3-csv-loading.png

---

### 4. File Size Validation
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md (Security section)
**Status:** ❓ NEEDS VERIFICATION
**Impact:** Production security

**Problem:**
- UI says 10MB limit but no enforcement
- No file type validation
- Can upload .exe as .csv
- No CSV injection protection

**Fix Required:**
```typescript
const validateFile = (file: File) => {
  // Size check
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large (max 10MB)')
  }

  // Type check
  if (!file.name.endsWith('.csv')) {
    throw new Error('Only CSV files allowed')
  }

  // CSV injection check
  const firstLine = await file.text().split('\n')[0]
  if (firstLine.startsWith('=') || firstLine.startsWith('+')) {
    throw new Error('Potential CSV injection detected')
  }
}
```

**Effort:** 2 hours
**Screenshot:** test-reports/verification/p0-4-file-validation.png

---

## 🟠 P1 - MAJOR (Fix Before Public Launch)

### 5. Workflow Steps Misleading
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #4
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 70% of users

**Problem:**
- Step 2 "Configure Prompt" shows green checkmark when prompt has content
- But user may not have finished configuring
- Encourages users to skip important configuration (Output Fields, Webhook)

**Fix:**
- Rename to "Configure Settings" (not just Prompt)
- Only show checkmark when user has reviewed all settings
- Add sub-indicators for optional settings

**Effort:** 30 minutes
**Screenshot:** test-reports/verification/p1-5-workflow-steps.png

---

### 6. Recent Files Not Clickable
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #5
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 60% of repeat users

**Problem:**
- Recent files shown but not interactive
- Looks clickable (has hover state) but does nothing
- Wastes prime real estate
- Forces users to re-upload same files

**Fix Required:**
```typescript
const handleRecentClick = async (fileName: string) => {
  // Option 1: Re-upload from storage
  const stored = localStorage.getItem(`csv-${fileName}`)
  if (stored) {
    setCsvData(JSON.parse(stored))
  }
}
```

**Effort:** 1 hour
**Screenshot:** test-reports/verification/p1-6-recent-files.png

---

### 7. Output Fields Unexplained and Confusing
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #6
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 80% of first-time users

**Problem:**
- Label "Output Fields" - what does this mean?
- Shows "bio" by default - why?
- Small input with "field..." placeholder - unclear purpose
- No help text explaining what this does

**Fix Required:**
```typescript
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <label className="text-xs font-medium text-zinc-300">
      Output Column Names
    </label>
    <Tooltip content="Name the columns that will appear in your output CSV">
      <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
    </Tooltip>
  </div>
  <p className="text-xs text-zinc-400">
    These will be the column headers in your results CSV
  </p>
</div>
```

**Effort:** 15 minutes
**Screenshot:** test-reports/verification/p1-7-output-fields.png

---

### 8. No Undo for Deleted Output Fields
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #7
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 30% of users

**Problem:**
- Click X on output field = instant deletion
- No confirmation
- No undo
- User must retype if mistake

**Fix:**
```typescript
// Option 1: Confirmation for last field
const removeField = (field) => {
  if (outputFields.length === 1) {
    if (!confirm('Remove last output field?')) return
  }
  setOutputFields(prev => prev.filter(f => f !== field))
}

// Option 2: Undo toast
const removeField = (field) => {
  const prev = [...outputFields]
  setOutputFields(outputFields.filter(f => f !== field))

  toast.info('Field removed', {
    action: {
      label: 'Undo',
      onClick: () => setOutputFields(prev)
    }
  })
}
```

**Effort:** 20 minutes
**Screenshot:** test-reports/verification/p1-8-undo-delete.png

---

### 9. Webhook Input Validation Missing
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #8
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 20% of advanced users

**Problem:**
- Accepts any text input
- No URL validation
- User won't know if webhook is invalid until run fails

**Fix Required:**
```typescript
const [webhookError, setWebhookError] = useState<string | null>(null)

const validateWebhook = (url: string) => {
  if (!url) return null // Optional field

  try {
    new URL(url)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'URL must start with http:// or https://'
    }
    return null
  } catch {
    return 'Invalid URL format'
  }
}

{webhookError && (
  <p className="text-xs text-red-400">{webhookError}</p>
)}
```

**Effort:** 15 minutes
**Screenshot:** test-reports/verification/p1-9-webhook-validation.png

---

### 10. Test Result Display (Not in Console)
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #13
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 60% of users testing prompts

**Problem:**
- Click "Test" → shows alert() with console.log message
- User must open DevTools to see result
- Non-technical users won't find console

**Fix Required:**
```typescript
// Show result in modal
<Modal open={testResult !== null}>
  <h3>Test Result</h3>
  <pre className="bg-zinc-900 p-4">
    {JSON.stringify(testResult, null, 2)}
  </pre>
  <button onClick={() => setTestResult(null)}>Close</button>
</Modal>
```

**Effort:** 1 hour
**Screenshot:** test-reports/verification/p1-10-test-result.png

---

### 11. Accessibility Fixes (ARIA, Screen Readers)
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md (Accessibility section)
**Status:** ❓ NEEDS VERIFICATION
**Impact:** Users with disabilities, WCAG compliance

**Fails:**
- ❌ No skip-to-content link
- ❌ Workflow steps not ARIA-labeled
- ❌ CSV table missing caption
- ❌ No screen reader announcements on state changes
- ❌ Dropzone not keyboard accessible
- ❌ No reduced motion support

**Fix:**
```typescript
<div role="region" aria-label="Workflow progress">
  <ol>
    <li aria-current={step === 1}>
      Upload CSV {csvData && '✓'}
    </li>
  </ol>
</div>

<div role="status" aria-live="polite">
  {csvData && `${csvData.totalRows} rows loaded`}
</div>

<table aria-label="CSV data preview">
  <caption>First 5 rows of uploaded CSV</caption>
</table>
```

**Effort:** 3-4 hours
**Screenshot:** test-reports/verification/p1-11-accessibility.png

---

## 🟡 P2 - MODERATE (Should Fix Soon)

### 12. CSV Preview Shows Only 5 Rows
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #9
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 40% of users with varied data

**Problem:**
- Shows first 5 rows only
- If data has errors/outliers in row 100, user won't see them
- No way to scroll through all data

**Fix:**
```typescript
// Option 1: Show more rows (10-20)
{csvData.rows.slice(0, 20).map(...)}

// Option 2: Pagination
<Pagination
  page={previewPage}
  perPage={10}
  total={csvData.totalRows}
/>

// Option 3: Virtual scroll (best for large files)
<VirtualTable
  rows={csvData.rows}
  height={400}
/>
```

**Effort:** 1-2 hours
**Screenshot:** test-reports/verification/p2-12-csv-preview-pagination.png

---

### 13. No Variable Validation
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #10
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 50% of users

**Problem:**
- User types {{naem}} instead of {{name}}
- No red underline or warning
- Only discovers error after running

**Fix:**
```typescript
const validateVariables = (promptText: string, columns: string[]) => {
  const vars = promptText.match(/\{\{(\w+)\}\}/g) || []
  const unknownVars = vars
    .map(v => v.slice(2, -2))
    .filter(v => !columns.includes(v))

  return unknownVars
}

{unknownVars.length > 0 && (
  <div className="text-xs text-amber-400 flex items-center gap-1">
    <AlertTriangle className="h-3 w-3" />
    Unknown variables: {unknownVars.join(', ')}
  </div>
)}
```

**Effort:** 30 minutes
**Screenshot:** test-reports/verification/p2-13-variable-validation.png

---

### 14. Prompt Preview Only Shows First Row
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #11
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 30% of users

**Problem:**
- Preview uses only first row data
- If first row has placeholder/test data, preview is misleading
- Can't see how prompt looks with different data variations

**Fix:**
```typescript
const [previewRow, setPreviewRow] = useState(0)

<div className="flex items-center justify-between">
  <h4>Prompt Preview</h4>
  <select value={previewRow} onChange={e => setPreviewRow(+e.target.value)}>
    {csvData.rows.map((_, i) => (
      <option key={i} value={i}>Row {i + 1}</option>
    ))}
  </select>
</div>
```

**Effort:** 20 minutes
**Screenshot:** test-reports/verification/p2-14-prompt-preview-row.png

---

### 15. No Keyboard Shortcut Discoverability
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #12
**Status:** ❓ NEEDS VERIFICATION
**Impact:** 70% of users (never discover shortcuts)

**Problem:**
- Keyboard shortcuts exist (⌘O, ⌘T, ⌘↵)
- Only shown in header (tiny, easy to miss)
- No tooltips on buttons

**Fix:**
```typescript
<Tooltip content="Upload CSV (⌘O)">
  <button>Upload</button>
</Tooltip>

<Tooltip content="Test with first row (⌘T)">
  <button>Test</button>
</Tooltip>

<Tooltip content="Run all rows (⌘↵)">
  <button>Run (3)</button>
</Tooltip>
```

**Effort:** 15 minutes
**Screenshot:** test-reports/verification/p2-15-keyboard-shortcuts.png

---

## 🔵 P3 - MINOR (Nice to Have / Future)

### 16. No Drag-and-Drop Visual Feedback
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #14
**Status:** ❓ NEEDS VERIFICATION

**Problem:**
- Dropzone shows "Drop here" on drag
- But doesn't highlight/animate
- Minimal visual change

**Effort:** 15 minutes

---

### 17. No Row Count Confirmation
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #15
**Status:** ❓ NEEDS VERIFICATION

**Problem:**
- Uploads file
- Sees table preview
- But no prominent "✓ 1,234 rows loaded successfully" message

**Effort:** 10 minutes

---

### 18. CSV Table Headers Not Sortable
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #16
**Status:** ❓ NEEDS VERIFICATION

**Problem:**
- Large CSV, want to see if all emails are valid
- Can't sort by column
- Can't see data patterns

**Effort:** 1 hour

---

### 19. No Export Before Running
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #17
**Status:** ❓ NEEDS VERIFICATION

**Problem:**
- User uploads CSV, makes edits in mind
- Wants to save cleaned CSV before processing
- No way to export just the uploaded data

**Effort:** 20 minutes

---

### 20. Prompt Textarea No Syntax Highlighting
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #18
**Status:** ❓ NEEDS VERIFICATION

**Problem:**
- Prompt uses {{variables}} syntax
- No highlighting
- Hard to spot typos

**Effort:** 2 hours

---

### 21. No Dark/Light Theme Toggle
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #19
**Status:** ❓ NEEDS VERIFICATION

**Problem:**
- Hardcoded dark theme
- Some users prefer light backgrounds

**Effort:** 2 hours

---

### 22. No Batch History/Resume
**Source:** CRITICAL_UX_AUDIT_2025_10_22.md #20
**Status:** ❓ NEEDS VERIFICATION

**Problem:**
- Run batch, close tab
- No way to see what ran before
- No way to resume interrupted batch

**Effort:** 4 hours

---

## 🆕 NEW ISSUES (From User Feedback)

### 23. Dashboard: Cannot Download Final Output Files
**Source:** User feedback (Oct 23, 2025)
**Status:** ❓ NEEDS VERIFICATION
**Priority:** 🔴 P0/P1
**Impact:** Critical for getting results

**Problem:**
- Dashboard shows batch history
- CSV and JSON download buttons present but may not download actual results
- Files are stored somewhere but not accessible
- Users can't get their processed data

**Fix Required:**
- Add download buttons for final output files
- Link to actual processed results, not just batch metadata
- Show file size and download link clearly

**Effort:** 2-3 hours
**Screenshot:** test-reports/verification/new-23-dashboard-downloads.png

---

### 24. Nav: Should Only Show "RUN" and "EXECUTIONS"
**Source:** User feedback (Oct 23, 2025)
**Status:** ❓ NEEDS VERIFICATION
**Priority:** 🟠 P1
**Impact:** Navigation clarity

**Problem:**
- Current nav shows: Dashboard, Process, Profile
- User wants: RUN (for /bulk processor), EXECUTIONS (for /dashboard history)
- Simpler, clearer naming
- Remove Profile link from main nav

**Fix Required:**
- Rename "Process" → "RUN"
- Rename "Dashboard" → "EXECUTIONS"
- Move Profile to dropdown only (not main nav)

**Effort:** 10 minutes
**Screenshot:** test-reports/verification/new-24-nav-links.png

---

### 25. Left Sidebar: Inconsistent Height, Doesn't Fill Screen
**Source:** User feedback (Oct 23, 2025)
**Status:** ❓ NEEDS VERIFICATION
**Priority:** 🟠 P1
**Impact:** Visual consistency, layout polish

**Problem:**
- Left sidebar (LHS) doesn't always fill screen height
- Inconsistent height across different states
- Should always be same height
- Should fill available vertical space

**Fix Required:**
```typescript
// Ensure LHS always fills screen
<div className="min-h-screen flex flex-col">
  {/* Left sidebar content */}
</div>

// Or use fixed height calculation
<div className="h-[calc(100vh-64px)]"> {/* Subtract header height */}
  {/* Content */}
</div>
```

**Effort:** 30 minutes
**Screenshot:** test-reports/verification/new-25-lhs-height.png

---

### 26. Data Preview: Should Show in Same Box as File Upload
**Source:** User feedback (Oct 23, 2025)
**Status:** ❓ NEEDS VERIFICATION
**Priority:** 🟠 P1
**Impact:** Layout clarity, reduce cognitive load

**Problem:**
- File upload area separate from CSV preview
- Preview appears in different location
- Creates cognitive disconnect
- User must look in two places

**Fix Required:**
- Combine upload dropzone and CSV preview into single card
- After upload, replace "Drop file here" with CSV table
- Keep everything in one cohesive area

**Effort:** 1 hour
**Screenshot:** test-reports/verification/new-26-data-preview-location.png

---

### 27. File Upload: Browse Button Doesn't Work
**Source:** User feedback (Oct 23, 2025)
**Status:** ❓ NEEDS VERIFICATION
**Priority:** 🔴 P0
**Impact:** Critical - users can't upload files

**Problem:**
- Browse button visible but may not trigger file picker
- Drag-and-drop works but button broken
- Forces users to use drag-and-drop only

**Fix Required:**
```typescript
// Ensure button triggers hidden file input
<input
  type="file"
  ref={fileInputRef}
  className="hidden"
  onChange={handleFileChange}
/>

<Button onClick={() => fileInputRef.current?.click()}>
  Browse
</Button>
```

**Effort:** 15 minutes
**Screenshot:** test-reports/verification/new-27-browse-button.png

---

### 28. Font Sizes: Inconsistent Throughout App
**Source:** User feedback (Oct 23, 2025)
**Status:** ❓ NEEDS VERIFICATION
**Priority:** 🟡 P2
**Impact:** Visual polish, readability

**Problem:**
- Font sizes vary: some 11px, some 12px, some 14px, some 16px
- No consistent typography scale
- Makes UI look unprofessional
- Hurts readability

**Fix Required:**
- Establish typography scale: text-xs (12px), text-sm (14px), text-base (16px), text-lg (18px)
- Apply consistently:
  - Headers: text-lg or text-xl
  - Body: text-sm or text-base
  - Labels: text-xs or text-sm
  - Help text: text-xs

**Effort:** 1-2 hours
**Screenshot:** test-reports/verification/new-28-font-consistency.png

---

### 29. Output Display: Raw CSV Format Unreadable
**Source:** User feedback (Oct 23, 2025)
**Status:** ❓ NEEDS VERIFICATION
**Priority:** 🟠 P1
**Impact:** Users can't read their results

**Problem:**
- Output shown as raw CSV string
- No formatting, no table
- Comma-separated values hard to read
- Should display as formatted table

**Fix Required:**
```typescript
// Parse CSV output and display as table
const parseOutputCSV = (csvString: string) => {
  const lines = csvString.split('\n')
  const headers = lines[0].split(',')
  const rows = lines.slice(1).map(line => line.split(','))

  return { headers, rows }
}

// Display as table
<Table>
  <TableHeader>
    <TableRow>
      {headers.map(h => <TableHead key={h}>{h}</TableHead>)}
    </TableRow>
  </TableHeader>
  <TableBody>
    {rows.map((row, i) => (
      <TableRow key={i}>
        {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Effort:** 1 hour
**Screenshot:** test-reports/verification/new-29-output-format.png

---

### 30. Filename: Not Showing Meaningful Names
**Source:** User feedback (Oct 23, 2025)
**Status:** ❓ NEEDS VERIFICATION
**Priority:** 🟡 P2
**Impact:** User confusion about which file is uploaded

**Problem:**
- Filename not displayed prominently
- Or shows truncated/hashed name
- User can't confirm correct file uploaded
- Especially important when switching between files

**Fix Required:**
```typescript
// Display full filename prominently
{csvData && (
  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded">
    <FileText className="h-4 w-4 text-green-400" />
    <div className="flex-1">
      <p className="font-medium text-sm">{csvData.filename}</p>
      <p className="text-xs text-muted-foreground">
        {csvData.rowCount} rows • {formatFileSize(csvData.fileSize)}
      </p>
    </div>
  </div>
)}
```

**Effort:** 30 minutes
**Screenshot:** test-reports/verification/new-30-filename-display.png

---

## 📊 Summary

**Total Issues:** 30
- 🔴 P0 (Critical): 6 issues
- 🟠 P1 (Major): 9 issues
- 🟡 P2 (Moderate): 5 issues
- 🔵 P3 (Minor): 10 issues

**Estimated Total Effort:** 30-40 hours

**Current Status:** ❓ ALL NEED VERIFICATION
**Next Step:** Take screenshots and verify each issue on deployed app

---

## 📋 Verification Plan

1. ✅ Create comprehensive tracking document (THIS FILE)
2. ⏳ Take screenshots of deployed app at https://bulk-gpt-app.vercel.app
3. ⏳ Go through each P0 issue with screenshots
4. ⏳ Go through each P1 issue with screenshots
5. ⏳ Go through P2/P3 issues with screenshots
6. ⏳ Document status (✅ Fixed / ❌ Broken / ⚠️ Partial) for each
7. ⏳ Create prioritized fix plan based on findings

**Verification Method:**
- Manual testing on deployed URL
- Screenshot evidence for each issue
- Clear documentation of current vs. expected behavior
