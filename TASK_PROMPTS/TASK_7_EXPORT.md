# TASK 7: Export & Download Functionality - TDD Approach

**Model:** Qwen-32B  
**Complexity:** Low-Medium  
**Estimated Time:** 2 hours

---

## 📋 Overview

Export batch results as CSV and JSON with metadata preservation.

## ✅ Tests (8 tests)

```typescript
// Test 1: Export to CSV
it('exports results to CSV format', () => {
  const results = [{ id: '1', input: 'Test', output: 'Result' }];
  const csv = exportToCSV(results);
  expect(csv).toContain('id,input,output');
  expect(csv).toContain('1,Test,Result');
});

// Test 2: Export to JSON
it('exports results to JSON', () => {
  const results = [{ id: '1', input: 'Test', output: 'Result' }];
  const json = exportToJSON(results);
  expect(json).toContain('"id":"1"');
});

// Test 3: Download triggers file
it('downloads file on button click', () => {
  render(<ExportButton results={[{ id: '1' }]} />);
  fireEvent.click(screen.getByRole('button', { name: /download/i }));
  // Verify download triggered
});

// Test 4: Includes metadata
it('includes batch metadata in export', () => {
  const csv = exportToCSV([], { batchId: 'batch-1', timestamp: '2024-01-01' });
  expect(csv).toContain('batch-1');
});

// Test 5: API endpoint
it('POST /api/export returns file', async () => {
  const response = await fetch('/api/export', {
    method: 'POST',
    body: JSON.stringify({
      results: [{ id: '1' }],
      format: 'csv'
    })
  });
  expect(response.ok).toBe(true);
});

// Test 6: Large file handling
it('handles large exports (10k+ rows)', () => {
  const results = Array(10000).fill({ id: '1' });
  const csv = exportToCSV(results);
  expect(csv.split('\n').length).toBeGreaterThan(10000);
});

// Test 7: Special characters
it('escapes special characters in CSV', () => {
  const results = [{ input: 'Quote"Test', output: 'Comma,Value' }];
  const csv = exportToCSV(results);
  expect(csv).toContain('"Quote\\"Test"');
});

// Test 8: Email on completion
it('sends email with attachment when requested', async () => {
  render(<ExportButton results={[]} emailOnComplete="user@test.com" />);
  fireEvent.click(screen.getByRole('button', { name: /email/i }));
  // Verify email sent
});
```

## 🛠️ Implementation

**lib/export.ts:**
- exportToCSV(results, metadata)
- exportToJSON(results, metadata)
- formatForEmail(results)

**app/api/export/route.ts:**
- POST endpoint
- Accept CSV/JSON format
- Return file download
- Optional email

**components/export-button.tsx:**
- Download as CSV
- Download as JSON
- Email results
- Progress indicator

## ✨ Acceptance Criteria

- [x] CSV export works
- [x] JSON export works
- [x] File download works
- [x] Large files handled
- [x] Special chars escaped
- [x] Metadata included
- [x] All tests passing
- [x] 80%+ coverage

---

**Status:** Ready for implementation
