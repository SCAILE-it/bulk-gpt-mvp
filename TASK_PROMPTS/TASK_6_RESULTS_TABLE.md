# TASK 6: Results Display & Table Component - TDD Approach

**Model:** Qwen-32B  
**Complexity:** Medium  
**Estimated Time:** 2 hours  
**Approach:** Test-Driven Development

---

## 📋 Overview

Build production-grade results table component with sorting, filtering, pagination, and accessibility.

## 🏗️ Architecture

```
components/results/
├── results-table.tsx       (Main table component)
├── table-utils.ts          (Sorting, filtering logic)
└── __tests__/
    └── results-table.test.tsx
```

## ✅ Tests (10 tests)

```typescript
// Test 1: Renders results table
it('renders table with results', () => {
  const results = [{ id: '1', input: 'John', output: 'Result1' }];
  render(<ResultsTable results={results} />);
  expect(screen.getByText('Result1')).toBeInTheDocument();
});

// Test 2: Sortable columns
it('sorts by column on header click', () => {
  const results = [
    { id: '1', name: 'Alice', score: 90 },
    { id: '2', name: 'Bob', score: 85 }
  ];
  render(<ResultsTable results={results} />);
  const scoreHeader = screen.getByText('Score');
  fireEvent.click(scoreHeader);
  // Verify sorted
});

// Test 3: Filter functionality
it('filters results by input', () => {
  const results = [
    { id: '1', input: 'John', output: 'Result1' },
    { id: '2', input: 'Jane', output: 'Result2' }
  ];
  render(<ResultsTable results={results} />);
  const filterInput = screen.getByPlaceholderText(/search/i);
  fireEvent.change(filterInput, { target: { value: 'John' } });
  expect(screen.getByText('Result1')).toBeInTheDocument();
  expect(screen.queryByText('Result2')).not.toBeInTheDocument();
});

// Test 4: Pagination
it('paginates results', () => {
  const results = Array(25).fill(0).map((_, i) => ({
    id: String(i),
    input: `Input${i}`,
    output: `Output${i}`
  }));
  render(<ResultsTable results={results} pageSize={10} />);
  expect(screen.getByText(/page 1/i)).toBeInTheDocument();
});

// Test 5: Accessible table headers
it('has accessible table structure', () => {
  const results = [{ id: '1', input: 'Test', output: 'Result' }];
  render(<ResultsTable results={results} />);
  const table = screen.getByRole('table');
  expect(table).toBeInTheDocument();
});

// Test 6: Copy to clipboard
it('copies result to clipboard', async () => {
  const results = [{ id: '1', input: 'Test', output: 'Result' }];
  render(<ResultsTable results={results} />);
  const copyBtn = screen.getByRole('button', { name: /copy/i });
  fireEvent.click(copyBtn);
  // Verify copied
});

// Test 7: Download selected
it('downloads selected results as CSV', () => {
  const results = [
    { id: '1', input: 'A', output: 'Result1' },
    { id: '2', input: 'B', output: 'Result2' }
  ];
  render(<ResultsTable results={results} />);
  const selectCheckbox = screen.getAllByRole('checkbox')[0];
  fireEvent.click(selectCheckbox);
  const downloadBtn = screen.getByRole('button', { name: /download/i });
  fireEvent.click(downloadBtn);
});

// Test 8: Empty state
it('shows empty state when no results', () => {
  render(<ResultsTable results={[]} />);
  expect(screen.getByText(/no results/i)).toBeInTheDocument();
});

// Test 9: Loading state
it('shows loading state', () => {
  render(<ResultsTable results={[]} loading={true} />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

// Test 10: Error handling
it('shows error message on error', () => {
  render(<ResultsTable results={[]} error="Failed to load" />);
  expect(screen.getByText('Failed to load')).toBeInTheDocument();
});
```

## 🛠️ Implementation

**components/results/results-table.tsx:**
- Display results in table
- Column headers (sortable)
- Pagination controls
- Filter input
- Select checkboxes
- Copy button per row
- Download selected as CSV
- Loading state
- Empty state
- Error state
- Accessible (WCAG AA)

**components/results/table-utils.ts:**
- Sort function
- Filter function
- Pagination logic
- CSV export

## 📋 Requirements

- Use shadcn/ui Table component
- Sortable columns (ascending/descending)
- Searchable/filterable
- Paginated (10 rows/page default)
- Select multiple rows
- Copy individual results
- Download selected as CSV
- Show row count
- Accessible (keyboard nav, ARIA)
- Responsive design

## ✨ Acceptance Criteria

- [x] All tests passing
- [x] 80%+ coverage
- [x] Sorting works
- [x] Filtering works
- [x] Pagination works
- [x] Copy works
- [x] Download works
- [x] Accessible
- [x] Responsive

---

**Status:** Ready for implementation
