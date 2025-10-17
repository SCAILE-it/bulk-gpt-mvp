# TASK 3: CSV Upload Component - TDD Approach

**Model:** Qwen-32B (balanced quality + speed)  
**Complexity:** Medium  
**Estimated Time:** 2 hours  
**Approach:** Test-Driven Development (tests first, then implementation)

---

## 📋 Task Overview

Build a production-grade CSV upload component using shadcn/ui and React hooks. Users upload CSV files, preview data, and confirm before processing.

## 🏗️ Architecture

```
components/upload/
├── csv-upload.tsx         (Main upload component - UPLOAD ZONE)
├── csv-preview.tsx        (Preview table showing first N rows)
├── upload-state.ts        (Zustand state management)
└── __tests__/
    ├── csv-upload.test.tsx
    └── csv-preview.test.tsx
```

## 📝 Requirements

### Functional Requirements
1. **File Upload Area**
   - Drag & drop support
   - Click to browse file
   - File type validation (CSV only)
   - File size validation (max 50MB)
   - Visual feedback (drag over state)

2. **File Preview**
   - Display first 5 rows
   - Show column headers
   - Display row count info
   - Scrollable for large headers

3. **State Management**
   - Track upload state (idle, uploading, preview, error)
   - Store selected file
   - Store parsed data
   - Handle errors gracefully

4. **User Actions**
   - Upload button → triggers processing
   - Cancel button → resets state
   - Clear button → remove preview

### Technical Requirements
- **Use shadcn/ui components** (Button, Card, Alert, etc)
- **TypeScript strict mode**
- **React hooks** (useState, useCallback, useRef)
- **Zustand for state** (optional, can use React state)
- **Error handling** with user-friendly messages
- **Accessible** (ARIA labels, keyboard nav)

### File Size & Limits
- Max file size: 50MB
- Max rows: 10,000 (warning at 5,000)
- Max columns: 50

---

## ✅ STEP 1: WRITE TESTS FIRST (TDD)

### Test File: `__tests__/csv-upload.test.tsx`

```typescript
// WRITE THIS FIRST - TEST FILE
// Copy into __tests__/csv-upload.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CSVUpload } from '../csv-upload';

describe('CSVUpload Component', () => {
  // Test 1: Renders upload area
  it('renders upload area with drag and drop instructions', () => {
    render(<CSVUpload onComplete={() => {}} />);
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });

  // Test 2: File upload via input
  it('allows file selection via file input', async () => {
    const { container } = render(<CSVUpload onComplete={() => {}} />);
    const input = container.querySelector('input[type="file"]');
    
    const file = new File(['a,b,c\n1,2,3'], 'test.csv', { type: 'text/csv' });
    await userEvent.upload(input as HTMLInputElement, file);
    
    expect(input).toHaveValue('');
  });

  // Test 3: Validates file type
  it('rejects non-CSV files', async () => {
    render(<CSVUpload onComplete={() => {}} />);
    
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    
    await userEvent.upload(input, file);
    expect(screen.getByText(/csv files only/i)).toBeInTheDocument();
  });

  // Test 4: Shows file size error
  it('rejects files larger than 50MB', async () => {
    render(<CSVUpload onComplete={() => {}} />);
    
    const largeFile = new File(
      [new ArrayBuffer(51 * 1024 * 1024)],
      'large.csv',
      { type: 'text/csv' }
    );
    
    expect(screen.getByText(/too large/i)).toBeInTheDocument();
  });

  // Test 5: Shows preview on successful upload
  it('displays preview after successful file selection', async () => {
    render(<CSVUpload onComplete={() => {}} />);
    
    const csvContent = 'name,email,age\nJohn,john@example.com,30\nJane,jane@example.com,25';
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' });
    
    const input = screen.getByRole('button', { name: /select/i });
    await userEvent.upload(input as any, file);
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });

  // Test 6: Handles drag and drop
  it('handles drag and drop of CSV files', async () => {
    render(<CSVUpload onComplete={() => {}} />);
    
    const dropZone = screen.getByText(/drag and drop/i).parentElement;
    
    const file = new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' });
    const dataTransfer = { files: [file] };
    
    fireEvent.dragOver(dropZone!);
    fireEvent.drop(dropZone!, dataTransfer);
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  // Test 7: Cancel clears state
  it('clears upload when cancel is clicked', async () => {
    render(<CSVUpload onComplete={() => {}} />);
    
    const file = new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' });
    // ... upload file ...
    
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelBtn);
    
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  // Test 8: Calls onComplete callback
  it('calls onComplete callback when upload is confirmed', async () => {
    const onComplete = vi.fn();
    render(<CSVUpload onComplete={onComplete} />);
    
    // ... upload file ...
    const confirmBtn = screen.getByRole('button', { name: /upload|process|submit/i });
    await userEvent.click(confirmBtn);
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  // Test 9: Shows row count warning
  it('shows warning for large CSV (>5000 rows)', async () => {
    render(<CSVUpload onComplete={() => {}} />);
    
    // Generate CSV with 5001 rows
    const csvContent = 'id\n' + Array(5001).fill(0).map((_, i) => i).join('\n');
    const file = new File([csvContent], 'large.csv', { type: 'text/csv' });
    
    // ... upload ...
    
    expect(screen.getByText(/large file|warning/i)).toBeInTheDocument();
  });

  // Test 10: Preview shows correct columns
  it('displays all CSV columns in preview header', async () => {
    render(<CSVUpload onComplete={() => {}} />);
    
    const csvContent = 'name,email,phone,address\nJohn,john@test.com,123,123 Main';
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' });
    
    // ... upload ...
    
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('phone')).toBeInTheDocument();
    expect(screen.getByText('address')).toBeInTheDocument();
  });
});
```

---

## 🛠️ STEP 2: IMPLEMENT COMPONENTS (After tests pass)

### Use shadcn/ui components:
- `Button` - for upload/cancel buttons
- `Card` - for container
- `Alert` - for errors and warnings
- `Progress` - for upload progress (optional)

### Key Implementation Details

**CSV Upload Component** should:
1. Accept drag/drop and click uploads
2. Validate file type (CSV only)
3. Validate file size (<50MB)
4. Parse CSV using `lib/csv-parser.ts`
5. Show preview in separate component
6. Manage state with React hooks

**CSV Preview Component** should:
1. Display headers in first row
2. Show first 5 data rows
3. Display row count
4. Be scrollable (horizontally for many columns)
5. Accessible table structure

### State Interface
```typescript
interface UploadState {
  file: File | null;
  parsedData: Record<string, string>[] | null;
  status: 'idle' | 'uploading' | 'preview' | 'error';
  error: string | null;
  rowCount: number;
}
```

---

## 📋 Acceptance Criteria

- [x] File upload via click and drag-drop works
- [x] CSV files only accepted
- [x] File size validated (max 50MB)
- [x] Preview shows first 5 rows
- [x] Row count displayed
- [x] Column headers shown
- [x] Cancel button clears state
- [x] Upload button triggers callback
- [x] Error messages user-friendly
- [x] Accessible (keyboard nav, ARIA labels)
- [x] All tests passing (80%+ coverage)
- [x] TypeScript strict mode
- [x] No console errors/warnings

---

## 🚀 Instructions

### Step 1: Copy the test file above
- Create: `components/upload/__tests__/csv-upload.test.tsx`
- Paste the test code

### Step 2: Run tests (will fail - expected!)
```bash
npm test -- csv-upload.test.tsx
```

### Step 3: Implement the component
- Create: `components/upload/csv-upload.tsx`
- Create: `components/upload/csv-preview.tsx`
- Implement to make tests pass

### Step 4: Validation
```bash
npm run type-check    # No TypeScript errors
npm run lint          # No linting errors
npm test              # All tests pass
```

### Step 5: When complete
- All tests passing ✅
- 80%+ coverage ✅
- No type errors ✅
- Ready for next task ✅

---

## 📚 Resources

- **shadcn/ui docs:** https://ui.shadcn.com/
- **CSV Parser:** Already exists in `lib/csv-parser.ts`
- **Testing:** Vitest + React Testing Library
- **Types:** Import from `lib/types.ts` (BulkGPTError, etc)

---

## 💡 Tips

1. **Start with tests** - they define the contract
2. **Use shadcn Button, Card, Alert** - don't build custom UI
3. **Reuse CSV parser** - already built in `lib/csv-parser.ts`
4. **Handle edge cases** - empty files, no headers, etc
5. **Make it accessible** - ARIA labels, semantic HTML
6. **Type everything** - TypeScript strict mode

---

**Status:** Ready for implementation  
**Next Task:** Task 4 (Gemini Integration)  
**Review Criteria:** All tests passing + 80%+ coverage


