# UX Improvements Checklist

## Feedback Points to Address

### 1. Advanced Options Section
- [ ] **REMOVE** "Advanced Options" collapsible section from bulk processor
- **Location**: `components/bulk/BulkProcessor.tsx` line ~830
- **Current state**: Contains API Access with "Show curl command" button
- **Action**: Remove entire section

### 2. Tool Selection
- [ ] **REDESIGN** tool selection (NOT remove - user wants better design)
- **Status**: Currently removed from UI but user NEVER wanted it removed
- **Investigation needed**:
  - Find where it was removed
  - Understand original design
  - Create better, more minimal design
- **User feedback**: "I never wanted it removed. just better designed"

### 3. Export Token Data
- [ ] **ADD** input_tokens and output_tokens to CSV/JSON exports
- **Files to modify**:
  - `app/api/export/route.ts` - add token fields to flattened results
  - Verify result data structure includes token data
- **Action**: Include token usage data in export files

### 4. Run/Test Button Layout
- [ ] **FIX** button cutoff issue on user's viewport
- **Location**: `components/bulk/BulkProcessor.tsx` line ~866-878
- **Current layout**:
  - Test button: `flex-1`
  - Run All button: `flex-[2]` (2:1 ratio)
- **Investigation needed**: Check actual button widths and responsiveness
- **User feedback**: "still cut off on my view"

### 5. Export Filename Consistency
- [ ] **FIX** different filenames between executions page and run page
- **Investigation needed**:
  - Find "executions" page location
  - Check how export is triggered from different pages
  - Ensure consistent filename format
- **Current logic**: `app/api/export/route.ts` line 82-88
  - With batchId: `results-${batchId}.${format}`
  - Without batchId: `bulk-gpt-export-${dateStr}-${timeStr}.${format}`

### 6. Profile API Access
- [ ] **REMOVE** API Access section from profile page
- **Location**: `app/(authenticated)/profile/page.tsx` line 293-304
- **Component to remove**: `<ApiKeyList />` card section
- **Action**: Remove entire "API Access" card

---

## Status
- **Created**: 2025-11-10
- **Total items**: 6
- **Completed**: 0
- **In progress**: 0
- **Blocked**: 0
