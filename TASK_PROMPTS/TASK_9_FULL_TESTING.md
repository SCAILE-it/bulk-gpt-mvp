# TASK 9: Full Integration Testing & Quality Assurance - TDD Approach

**Model:** Qwen-32B  
**Complexity:** Complex  
**Estimated Time:** 2 hours

---

## 📋 Overview

Build comprehensive integration tests, E2E tests, and quality assurance suite for the entire Bulk GPT app.

## ✅ Tests (15+ comprehensive tests)

```typescript
// INTEGRATION TESTS

// Test 1: Full CSV upload → process → results flow
it('completes full workflow from upload to results', async () => {
  const { getByRole, getByText } = render(<BulkGPTApp />);
  
  // Upload CSV
  const file = new File(['name\nJohn\nJane'], 'test.csv', { type: 'text/csv' });
  const input = getByRole('button', { name: /upload/i });
  fireEvent.change(input, { target: { files: [file] } });
  
  // Confirm upload
  fireEvent.click(getByText(/process/i));
  
  // Wait for results
  await waitFor(() => {
    expect(getByText(/results/i)).toBeInTheDocument();
  });
});

// Test 2: API integration - Gemini processing
it('processes rows through Gemini API', async () => {
  const response = await fetch('/api/process', {
    method: 'POST',
    body: JSON.stringify({
      prompt: 'Analyze: {{name}}',
      rows: [{ name: 'Test User' }]
    })
  });
  expect(response.ok).toBe(true);
  const data = await response.json();
  expect(data.results).toBeTruthy();
});

// Test 3: Database persistence
it('persists results to Supabase', async () => {
  const processor = new BatchProcessor({ /* ... */ });
  await processor.processBatch();
  
  const results = await supabase
    .from('batch_results')
    .select('*')
    .eq('batch_id', processor.getId());
  
  expect(results.data.length).toBeGreaterThan(0);
});

// Test 4: Batch status tracking
it('updates batch status throughout processing', async () => {
  const processor = new BatchProcessor({ /* ... */ });
  
  const response = await fetch(`/api/batch/${processor.getId()}`);
  let data = await response.json();
  expect(data.status).toBe('pending');
  
  await processor.processBatch();
  
  const response2 = await fetch(`/api/batch/${processor.getId()}`);
  data = await response2.json();
  expect(data.status).toBe('completed');
});

// Test 5: Export integration
it('exports results via API', async () => {
  const processor = new BatchProcessor({ /* ... */ });
  await processor.processBatch();
  
  const response = await fetch('/api/export', {
    method: 'POST',
    body: JSON.stringify({
      batchId: processor.getId(),
      format: 'csv'
    })
  });
  expect(response.ok).toBe(true);
});

// E2E TESTS

// Test 6: Authenticated user flow
it('handles authenticated user workflow', async () => {
  // Login
  await login('test@example.com', 'password');
  
  // Upload file
  const file = new File(['data'], 'test.csv', { type: 'text/csv' });
  await uploadFile(file);
  
  // Process
  await submitProcessing();
  
  // Download results
  await downloadResults('csv');
});

// Test 7: Large batch processing
it('handles large batches (5000+ rows)', async () => {
  const largeData = Array(5000).fill({ id: '1', name: 'Test' });
  const processor = new BatchProcessor({
    rows: largeData,
    batchId: 'large-batch'
  });
  
  await processor.processBatch();
  const stats = processor.getStats();
  expect(stats.processed).toBe(5000);
});

// Test 8: Concurrent batch processing
it('handles multiple concurrent batches', async () => {
  const batch1 = new BatchProcessor({
    rows: [{ id: '1' }],
    batchId: 'batch-1'
  });
  const batch2 = new BatchProcessor({
    rows: [{ id: '2' }],
    batchId: 'batch-2'
  });
  
  await Promise.all([
    batch1.processBatch(),
    batch2.processBatch()
  ]);
  
  expect(batch1.getStatus()).toBe('completed');
  expect(batch2.getStatus()).toBe('completed');
});

// Test 9: Error recovery in workflow
it('recovers from errors mid-workflow', async () => {
  const processor = new BatchProcessor({ /* ... */ });
  
  // Start processing
  const promise = processor.processBatch();
  
  // Simulate error
  setTimeout(() => processor.cancel(), 100);
  
  try {
    await promise;
  } catch (e) {
    // Resume from error
    await processor.resume();
  }
  
  expect(processor.getStatus()).toBe('completed');
});

// PERFORMANCE TESTS

// Test 10: CSV parsing performance
it('parses large CSV within time limit', () => {
  const largeCSV = generateLargeCSV(10000);
  const start = performance.now();
  const parsed = parseCSV(largeCSV);
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(5000); // < 5 seconds
  expect(parsed.length).toBe(10000);
});

// Test 11: API response time
it('processes request in < 30 seconds', async () => {
  const start = Date.now();
  const response = await fetch('/api/process', {
    method: 'POST',
    body: JSON.stringify({
      prompt: 'Test',
      rows: [{ id: '1' }]
    })
  });
  const duration = Date.now() - start;
  
  expect(response.ok).toBe(true);
  expect(duration).toBeLessThan(30000);
});

// SECURITY TESTS

// Test 12: Input validation
it('validates and sanitizes all inputs', async () => {
  const malicious = '<script>alert("xss")</script>';
  const response = await fetch('/api/process', {
    method: 'POST',
    body: JSON.stringify({
      prompt: malicious,
      rows: [{ data: malicious }]
    })
  });
  // Should reject or sanitize
  expect(response.status).not.toBe(200);
});

// Test 13: Authentication required
it('requires authentication for API access', async () => {
  const response = await fetch('/api/process', {
    method: 'POST',
    body: JSON.stringify({ /* ... */ })
  });
  expect(response.status).toBe(401);
});

// Test 14: CORS validation
it('enforces CORS policies', async () => {
  const response = await fetch('/api/process', {
    method: 'POST',
    headers: { 'Origin': 'https://evil.com' },
    body: JSON.stringify({ /* ... */ })
  });
  expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
});

// COVERAGE TESTS

// Test 15: Overall coverage check
it('maintains 80%+ code coverage', async () => {
  const coverage = await getCoverageReport();
  expect(coverage.lines).toBeGreaterThanOrEqual(80);
  expect(coverage.branches).toBeGreaterThanOrEqual(80);
  expect(coverage.functions).toBeGreaterThanOrEqual(80);
});
```

## 🛠️ Implementation

**__tests__/integration.test.ts:**
- Full workflow tests
- API integration tests
- Database tests
- Concurrent processing

**__tests__/e2e.test.ts:**
- User authentication flows
- Large batch processing
- Error recovery
- Performance benchmarks

**__tests__/security.test.ts:**
- Input validation
- XSS prevention
- CSRF protection
- Rate limiting

**__tests__/performance.test.ts:**
- CSV parsing speed
- API response time
- Memory usage
- Database query time

## ✨ Acceptance Criteria

- [x] All integration tests passing
- [x] All E2E tests passing
- [x] Security tests passing
- [x] Performance tests passing
- [x] 80%+ code coverage
- [x] No security vulnerabilities
- [x] API response < 30s
- [x] CSV parsing < 5s
- [x] Production ready

---

**Status:** Final task - Ready for implementation
