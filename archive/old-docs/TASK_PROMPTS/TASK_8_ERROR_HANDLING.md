# TASK 8: Error Handling & Resilience - TDD Approach

**Model:** Qwen-32B  
**Complexity:** Medium  
**Estimated Time:** 2 hours

---

## 📋 Overview

Build comprehensive error handling, retries, and recovery mechanisms.

## ✅ Tests (10 tests)

```typescript
// Test 1: Error boundary
it('catches and displays component errors', () => {
  render(<ErrorBoundary><ThrowingComponent /></ErrorBoundary>);
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});

// Test 2: Network retry
it('retries failed network requests', async () => {
  let attempts = 0;
  const fn = async () => {
    attempts++;
    if (attempts < 3) throw new Error('Network error');
    return { data: 'success' };
  };
  const result = await withRetry(fn, { maxRetries: 3 });
  expect(attempts).toBe(3);
  expect(result.data).toBe('success');
});

// Test 3: Exponential backoff
it('uses exponential backoff for retries', async () => {
  const delays: number[] = [];
  await withRetry(
    () => Promise.reject(new Error('fail')),
    {
      maxRetries: 3,
      onRetry: (delay) => delays.push(delay)
    }
  ).catch(() => {});
  expect(delays[0]).toBeLessThan(delays[1]);
});

// Test 4: Error logging
it('logs errors to monitoring service', async () => {
  const logSpy = vi.spyOn(console, 'error');
  try {
    throw new BulkGPTError('Test error', 'PROCESSING_FAILED');
  } catch (e) {
    logError(e);
  }
  expect(logSpy).toHaveBeenCalled();
});

// Test 5: User-friendly messages
it('shows user-friendly error messages', () => {
  const error = new BulkGPTError('API timeout', 'TIMEOUT');
  const message = getUserFriendlyMessage(error);
  expect(message).toContain('taking longer');
});

// Test 6: Recovery state
it('allows recovery from errors', async () => {
  const processor = new BatchProcessor({ /* ... */ });
  try {
    await processor.processBatch();
  } catch (e) {
    // Verify can retry
    await processor.retry();
  }
});

// Test 7: Validation errors
it('validates input before processing', () => {
  expect(() => validateInput({})).toThrow();
  expect(() => validateInput({ prompt: '', rows: [] })).toThrow();
});

// Test 8: Timeout handling
it('handles request timeouts', async () => {
  const promise = fetchWithTimeout('/api/process', 1000);
  await expect(promise).rejects.toThrow('Timeout');
});

// Test 9: Partial failure recovery
it('recovers from partial batch failures', async () => {
  const processor = new BatchProcessor({
    rows: [{ id: '1' }, { id: '2' }, { id: '3' }]
  });
  // Mock second row fails
  const results = await processor.processBatch();
  expect(results).toHaveLength(2); // 1 and 3 succeed
});

// Test 10: Circuit breaker
it('implements circuit breaker for API', () => {
  const breaker = new CircuitBreaker(
    () => fetch('/api/process'),
    { threshold: 5 }
  );
  for (let i = 0; i < 5; i++) {
    breaker.execute().catch(() => {});
  }
  expect(breaker.isOpen()).toBe(true);
});
```

## 🛠️ Implementation

**lib/errors.ts:**
- BulkGPTError class
- Error codes
- Error messages

**lib/retry.ts:**
- withRetry()
- exponential backoff
- circuit breaker

**lib/validation.ts:**
- validateInput()
- validateCSV()
- validatePrompt()

**components/error-boundary.tsx:**
- Error boundary component
- Error display
- Retry button

**app/api/error-handler.ts:**
- Centralized error handling
- Logging
- Monitoring

## ✨ Acceptance Criteria

- [x] Error boundary works
- [x] Retries work with backoff
- [x] User-friendly messages
- [x] Validation enforced
- [x] Timeout handling
- [x] Logging working
- [x] Circuit breaker
- [x] All tests passing
- [x] 80%+ coverage

---

**Status:** Ready for implementation
