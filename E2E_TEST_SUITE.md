# Bulk GPT E2E Test Suite - Comprehensive User Flow Testing

**Purpose**: Validate all critical user journeys in the Bulk GPT wizard SaaS application

**Test Environment**: http://localhost:5005

---

## Test Suite Overview

### Coverage Areas
1. ✅ Authentication Flow
2. ✅ Wizard Step 1: CSV Upload
3. ✅ Wizard Step 2: Configure Prompt
4. ✅ Wizard Step 3: View Results
5. ✅ Navigation & State Management
6. ✅ Error Handling
7. ✅ Accessibility
8. ✅ Responsive Design

---

## 1. Authentication Flow Tests

### Test 1.1: Login with Valid Credentials
**Steps**:
1. Navigate to `/auth`
2. Verify page title: "Welcome to Bulk GPT"
3. Verify email input exists
4. Verify password input exists
5. Enter email: `test@example.com`
6. Enter password: `password`
7. Click "Sign in" button
8. Verify redirect to `/wizard`
9. Verify no error messages shown

**Expected**: User logged in and redirected to wizard

---

### Test 1.2: Login with Invalid Credentials
**Steps**:
1. Navigate to `/auth`
2. Enter email: `invalid@example.com`
3. Enter password: `wrongpassword`
4. Click "Sign in" button
5. Verify error message displayed
6. Verify user remains on `/auth` page

**Expected**: Error message shown, no redirect

---

### Test 1.3: Demo Credentials Display
**Steps**:
1. Navigate to `/auth`
2. Verify text exists: "Demo credentials: test@example.com / password"

**Expected**: Demo credentials visible for easy testing

---

## 2. Wizard Step 1: CSV Upload Tests

### Test 2.1: Upload Valid CSV File
**Pre-condition**: User logged in

**Steps**:
1. Navigate to `/wizard`
2. Verify current step indicator shows "1" (Upload)
3. Verify dropzone visible with text "Upload CSV File"
4. Verify FileSpreadsheet icon displayed
5. Create test CSV file:
   ```
   name,email,company
   John Doe,john@example.com,Acme Inc
   Jane Smith,jane@example.com,Tech Corp
   Bob Johnson,bob@example.com,StartupXYZ
   ```
6. Drag and drop CSV onto dropzone
7. Wait for parsing (max 5 seconds)
8. Verify file preview appears
9. Verify shows: "3 rows" and "3 columns"
10. Verify column headers displayed: name, email, company
11. Verify preview table shows first few rows
12. Verify "Next" button enabled

**Expected**: CSV parsed successfully, preview shown, can proceed

---

### Test 2.2: Drag and Drop Visual Feedback
**Steps**:
1. Navigate to `/wizard` (Step 1)
2. Hover file over dropzone (simulate dragover)
3. Verify dropzone border changes to primary color
4. Verify background color changes
5. Verify icon scales up (scale-110)
6. Verify text changes to "Drop your CSV file"
7. Release drag (simulate dragleave)
8. Verify dropzone returns to normal state

**Expected**: Visual feedback during drag operation

---

### Test 2.3: Browse Files Button
**Steps**:
1. Navigate to `/wizard` (Step 1)
2. Verify "Browse Files" button visible
3. Click "Browse Files"
4. Verify file input dialog appears
5. Select test CSV file
6. Verify file is processed same as drag-drop

**Expected**: Browse button works as alternative to drag-drop

---

### Test 2.4: Invalid File Rejection
**Steps**:
1. Navigate to `/wizard` (Step 1)
2. Try to upload `.txt` file
3. Verify error message displayed
4. Try to upload file > 50MB
5. Verify error message: "File too large"
6. Try to upload empty CSV
7. Verify error message: "No data found"

**Expected**: Invalid files rejected with clear errors

---

### Test 2.5: Remove Uploaded File
**Steps**:
1. Upload valid CSV
2. Wait for preview to appear
3. Click "Remove" or "X" button (if available)
4. Verify preview disappears
5. Verify dropzone returns to initial state
6. Verify "Next" button disabled

**Expected**: Can remove file and start over

---

## 3. Wizard Step 2: Configure Prompt Tests

### Test 3.1: Complete Prompt Configuration Flow
**Pre-condition**: CSV uploaded with columns: name, email, company

**Steps**:
1. From Step 1, click "Next"
2. Verify step indicator shows "2" (Configure)
3. Verify CSV filename displayed at top
4. Verify row count displayed
5. Verify helpful tip/hint displayed: "Use variables in your prompt"
6. Verify prompt textarea visible and empty
7. Verify column pills displayed: name, email, company
8. Enter prompt: "Write a personalized email to {{name}} at {{company}}"
9. Verify no validation errors shown
10. Verify processing mode cards visible
11. Verify "Test Mode" card shows "3 rows" (or min 5)
12. Verify time estimate displayed (~15 sec)
13. Verify cost estimate displayed (<$0.01)
14. Click "Test Mode" card
15. Verify card border changes to primary
16. Verify checkmark icon appears
17. Verify "Next" button enabled
18. Click "Next"
19. Verify redirect to Step 3 (Results)

**Expected**: Full configuration flow works smoothly

---

### Test 3.2: Real-time Variable Validation
**Steps**:
1. Navigate to Step 2
2. Enter prompt: "Hello {{invalid_column}}"
3. Verify textarea border turns red immediately
4. Verify error icon (AlertCircle) appears
5. Verify error message: "Variable not found in CSV"
6. Verify available columns listed
7. Verify "Next" button disabled
8. Clear prompt
9. Enter valid prompt: "Hello {{name}}"
10. Verify border turns back to normal
11. Verify error message disappears
12. Verify "Next" button enabled

**Expected**: Real-time validation with visual feedback

---

### Test 3.3: Column Pill Insertion
**Steps**:
1. Navigate to Step 2
2. Click in prompt textarea (focus it)
3. Place cursor at specific position
4. Click "name" column pill
5. Verify "{{name}}" inserted at cursor position
6. Click "company" column pill
7. Verify "{{company}}" inserted
8. Verify cursor moves after insertion
9. Verify validation runs automatically

**Expected**: Column pills insert variables correctly

---

### Test 3.4: Processing Mode Selection
**Steps**:
1. Navigate to Step 2 with valid prompt
2. Verify both mode cards visible: "Test Mode" and "Full Processing"
3. Verify "Test Mode" shows smaller row count
4. Verify "Full Processing" shows total row count
5. Click "Test Mode"
6. Verify selection indicator (checkmark + border)
7. Click "Full Processing"
8. Verify selection switches
9. Verify estimates update accordingly

**Expected**: Can toggle between processing modes

---

### Test 3.5: Advanced Options (if implemented)
**Steps**:
1. Navigate to Step 2
2. Look for "Advanced Options" section
3. If exists, click to expand
4. Verify context textarea (optional)
5. Verify output columns section (optional)
6. Test adding custom output columns
7. Test removing output columns

**Expected**: Advanced options work if present

---

### Test 3.6: Back Navigation
**Steps**:
1. Navigate to Step 2
2. Click "Back" button
3. Verify returns to Step 1
4. Verify uploaded CSV data preserved
5. Click "Next" again
6. Verify returns to Step 2
7. Verify configuration preserved

**Expected**: Can navigate back without losing data

---

## 4. Wizard Step 3: Results Tests

### Test 4.1: Processing Start and Polling
**Pre-condition**: Completed Steps 1 & 2

**Steps**:
1. From Step 2, click "Next" to start processing
2. Verify redirect to Step 3 (Results)
3. Verify loading indicator appears
4. Verify progress updates shown
5. Wait for processing to complete (max 60 seconds)
6. Verify loading indicator disappears
7. Verify results table appears

**Expected**: Processing starts and completes successfully

---

### Test 4.2: Results Table Display
**Steps**:
1. After processing completes
2. Verify results table has columns: Input, Output, Status
3. Verify input column shows formatted data (name • company)
4. Verify output column shows generated content
5. Verify status column shows badges (Completed/Failed)
6. Verify completed rows show green badge with checkmark
7. Verify failed rows show red badge with X
8. Count total rows displayed
9. Verify matches expected count

**Expected**: All results displayed clearly

---

### Test 4.3: Error Message Display
**Steps**:
1. Find a failed result row (if any)
2. Verify error message displayed (not generic "No output")
3. Verify error is specific (e.g., "Rate limit exceeded")
4. Verify error icon shown
5. Verify helpful context provided

**Expected**: Errors are informative and actionable

---

### Test 4.4: Summary Statistics
**Steps**:
1. After processing completes
2. Locate summary section
3. Verify "Total" count displayed
4. Verify "Completed" count displayed
5. Verify "Failed" count displayed
6. Verify "Success Rate" percentage displayed
7. Verify calculations are correct
8. If 100% success, verify celebratory message (if implemented)

**Expected**: Summary stats accurate and visible

---

### Test 4.5: Export to CSV
**Steps**:
1. After processing completes
2. Locate "Export CSV" button
3. Click "Export CSV"
4. Verify download initiated
5. Check downloaded file exists
6. Open CSV file
7. Verify contains all columns: input data + output + status
8. Verify all rows present
9. Verify data is correctly formatted

**Expected**: Export works and file is valid

---

### Test 4.6: Copy to Clipboard
**Steps**:
1. After processing completes
2. Locate "Copy to Clipboard" button
3. Click button
4. Verify success message appears: "Copied to clipboard"
5. Paste clipboard content (manually or via test)
6. Verify format is CSV or tab-separated
7. Verify all data included

**Expected**: Copy functionality works

---

### Test 4.7: Restart Wizard
**Steps**:
1. From Step 3 (Results)
2. Locate "Restart" or "Start New Batch" button
3. Click button
4. Verify confirmation dialog (if present)
5. Confirm action
6. Verify redirect to Step 1
7. Verify all data cleared
8. Verify fresh state

**Expected**: Can restart wizard cleanly

---

## 5. Navigation & State Management Tests

### Test 5.1: Step Indicator Navigation
**Steps**:
1. Complete Step 1 (upload CSV)
2. Verify Step 1 shows checkmark (completed)
3. Verify Step 2 is clickable
4. Click Step 2 indicator
5. Verify navigates to Step 2
6. Verify data preserved
7. Complete Step 2
8. Verify Step 2 shows checkmark
9. Click Step 1 indicator
10. Verify can navigate back
11. Verify CSV data still present

**Expected**: Can navigate via step indicators

---

### Test 5.2: Browser Back/Forward
**Steps**:
1. Complete Step 1
2. Navigate to Step 2
3. Press browser back button
4. Verify returns to Step 1
5. Verify data preserved
6. Press browser forward button
7. Verify returns to Step 2
8. Verify configuration preserved

**Expected**: Browser navigation works

---

### Test 5.3: Page Refresh Handling
**Steps**:
1. Upload CSV in Step 1
2. Refresh page (F5 or Cmd+R)
3. Verify appropriate handling:
   - Either: Data persists (if sessionStorage/localStorage used)
   - Or: Shows warning before losing data
   - Or: Returns to initial state gracefully

**Expected**: Refresh handled gracefully

---

### Test 5.4: Direct URL Access
**Steps**:
1. Without logging in, navigate to `/wizard`
2. Verify redirects to `/auth`
3. Login successfully
4. Navigate to `/wizard` (Step 1)
5. Try to access `/wizard?step=2` directly
6. Verify appropriate handling (redirects to step 1 or shows error)

**Expected**: URL manipulation handled safely

---

## 6. Error Handling Tests

### Test 6.1: Network Error During Upload
**Steps**:
1. Disable network (or simulate)
2. Try to upload CSV
3. Verify error message displayed
4. Re-enable network
5. Retry upload
6. Verify works

**Expected**: Network errors handled gracefully

---

### Test 6.2: API Error During Processing
**Steps**:
1. Complete Steps 1 & 2
2. Start processing
3. If API fails, verify:
   - Error message displayed
   - Option to retry shown
   - User not stuck in loading state

**Expected**: API errors handled with retry option

---

### Test 6.3: Timeout Handling
**Steps**:
1. Start processing large batch
2. If timeout occurs (> 5 minutes)
3. Verify appropriate message shown
4. Verify user can take action (retry/cancel)

**Expected**: Timeouts handled gracefully

---

## 7. Accessibility Tests

### Test 7.1: Keyboard Navigation
**Steps**:
1. Navigate to `/auth`
2. Use Tab key to navigate through form
3. Verify focus visible on each element
4. Press Enter on "Sign in" button
5. In wizard, Tab through all interactive elements
6. Verify all buttons/inputs accessible via keyboard

**Expected**: Full keyboard accessibility

---

### Test 7.2: Screen Reader Support
**Steps**:
1. Check for ARIA labels on:
   - Step indicators
   - Form inputs
   - Buttons
   - Error messages
2. Verify role attributes present
3. Verify aria-current on active step
4. Verify aria-invalid on error inputs

**Expected**: Screen reader compatible

---

### Test 7.3: Focus Management
**Steps**:
1. Navigate between steps
2. Verify focus moves to appropriate element
3. Open modal/dialog (if any)
4. Verify focus trapped in modal
5. Close modal
6. Verify focus returns to trigger element

**Expected**: Focus managed properly

---

## 8. Responsive Design Tests

### Test 8.1: Mobile View (375px width)
**Steps**:
1. Resize browser to 375px width
2. Navigate through all wizard steps
3. Verify:
   - Layout not broken
   - Text readable
   - Buttons accessible
   - Processing mode cards stack vertically
   - Navigation usable

**Expected**: Works on mobile devices

---

### Test 8.2: Tablet View (768px width)
**Steps**:
1. Resize to 768px width
2. Verify layout adjusts appropriately
3. Verify processing mode cards layout

**Expected**: Works on tablets

---

### Test 8.3: Desktop View (1920px width)
**Steps**:
1. Resize to 1920px width
2. Verify content centered
3. Verify max-width constraints applied
4. Verify no excessive whitespace

**Expected**: Works on large screens

---

## 9. Performance Tests

### Test 9.1: Large CSV Handling
**Steps**:
1. Upload CSV with 1000 rows
2. Verify parsing time < 5 seconds
3. Verify preview renders without lag
4. Verify navigation smooth

**Expected**: Handles large files efficiently

---

### Test 9.2: Multiple Variable Validation
**Steps**:
1. Enter prompt with 10+ variables
2. Verify validation runs quickly (< 100ms)
3. Verify no UI lag

**Expected**: Validation is performant

---

## 10. Edge Cases Tests

### Test 10.1: Empty CSV
**Steps**:
1. Upload CSV with only headers (no data rows)
2. Verify appropriate error or warning
3. Verify clear guidance provided

**Expected**: Empty CSV handled gracefully

---

### Test 10.2: Special Characters in CSV
**Steps**:
1. Upload CSV with special characters: quotes, commas, newlines
2. Verify parsing handles them correctly
3. Verify data displayed properly
4. Verify processing works

**Expected**: Special characters handled correctly

---

### Test 10.3: Very Long Prompt
**Steps**:
1. Enter prompt with 1000+ characters
2. Verify textarea handles long text
3. Verify validation still works
4. Verify can scroll within textarea

**Expected**: Long prompts handled

---

### Test 10.4: Unicode Characters
**Steps**:
1. Upload CSV with emoji, Chinese, Arabic text
2. Verify displays correctly
3. Verify processing works
4. Verify results maintain unicode

**Expected**: Unicode fully supported

---

## Test Execution Order

**Recommended execution sequence**:

1. **Setup Phase**:
   - Test 1.1 (Login)
   
2. **Happy Path (Critical)**:
   - Test 2.1 (Upload CSV)
   - Test 3.1 (Configure prompt)
   - Test 4.1 (Processing)
   - Test 4.2 (Results display)
   - Test 4.5 (Export)
   
3. **Feature Validation**:
   - Test 2.2-2.5 (Upload features)
   - Test 3.2-3.5 (Configuration features)
   - Test 4.3-4.7 (Results features)
   
4. **Navigation & State**:
   - Test 5.1-5.4 (All navigation tests)
   
5. **Error Scenarios**:
   - Test 1.2, 2.4, 6.1-6.3
   
6. **Accessibility**:
   - Test 7.1-7.3
   
7. **Responsive**:
   - Test 8.1-8.3
   
8. **Edge Cases**:
   - Test 9.1-9.2, 10.1-10.4

---

## Success Criteria

**All tests must pass with**:
- ✅ No console errors
- ✅ No broken layouts
- ✅ All user actions complete successfully
- ✅ Error messages are clear and actionable
- ✅ Performance within acceptable limits
- ✅ Accessibility standards met
- ✅ Responsive design works across breakpoints

---

## Test Data Files Needed

### test-data.csv
```csv
name,email,company,title
John Doe,john@acme.com,Acme Inc,CEO
Jane Smith,jane@techcorp.com,Tech Corp,CTO
Bob Johnson,bob@startup.com,StartupXYZ,Engineer
Alice Williams,alice@design.co,Design Co,Designer
Charlie Brown,charlie@sales.io,Sales Inc,Manager
```

### test-large.csv
1000 rows with generated data (for performance testing)

### test-special-chars.csv
```csv
name,description,notes
"Smith, John","He said ""Hello""","Line 1
Line 2"
O'Brien,Test's data,Normal
Unicode Test,测试,مرحبا
Emoji User,👋 Hello,🎉
```

---

**Total Tests**: 50+ individual test cases
**Estimated Execution Time**: 30-45 minutes (full suite)
**Critical Path Time**: 5-10 minutes (happy path only)



