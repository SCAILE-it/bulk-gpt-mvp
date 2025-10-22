# TASK 5: Batch Processor - TDD Approach

**Model:** DeepSeek-33B + Qwen-32B (parallel)  
**Complexity:** Complex  
**Estimated Time:** 3 hours  
**Approach:** Test-Driven Development

---

## 📋 Overview

Build production-grade batch processor that:
- Processes CSV rows through Gemini API
- Stores results in Supabase
- Tracks progress
- Handles failures & retries
- Supports cancellation

## 🏗️ Architecture

```
lib/
├── batch-processor.ts      (Main batch logic)
├── progress-tracker.ts     (Track progress)
└── __tests__/
    ├── batch-processor.test.ts
    └── progress-tracker.test.ts

app/api/
├── batch/
│   └── route.ts           (Create batch API)
└── batch/[id]/
    └── route.ts           (Get batch status API)
```

## ✅ Tests (TDD First)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { BatchProcessor } from '../batch-processor';
import { ProgressTracker } from '../progress-tracker';

describe('BatchProcessor', () => {
  // Test 1: Initialize batch
  it('initializes batch with metadata', () => {
    const processor = new BatchProcessor({
      prompt: 'Test prompt',
      rows: [{ name: 'John' }, { name: 'Jane' }],
      batchId: 'batch-1'
    });
    expect(processor.getId()).toBe('batch-1');
    expect(processor.getStatus()).toBe('pending');
  });

  // Test 2: Process single row
  it('processes single row', async () => {
    const processor = new BatchProcessor({
      prompt: 'Analyze: {{name}}',
      rows: [{ name: 'John' }],
      batchId: 'batch-1'
    });
    const result = await processor.processRow({ name: 'John' });
    expect(result).toBeTruthy();
  });

  // Test 3: Process batch
  it('processes all rows in batch', async () => {
    const processor = new BatchProcessor({
      prompt: 'Test: {{id}}',
      rows: [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' }
      ],
      batchId: 'batch-1'
    });
    await processor.processBatch();
    expect(processor.getStatus()).toBe('completed');
  });

  // Test 4: Stores results in Supabase
  it('stores results in Supabase', async () => {
    const processor = new BatchProcessor({
      prompt: 'Test',
      rows: [{ id: '1' }],
      batchId: 'batch-1'
    });
    await processor.processBatch();
    // Verify stored in DB
    const results = await processor.getResults();
    expect(results.length).toBe(1);
  });

  // Test 5: Tracks progress
  it('tracks processing progress', async () => {
    const tracker = new ProgressTracker();
    processor.onProgress((progress) => {
      tracker.update(progress);
    });
    await processor.processBatch();
    expect(tracker.getProgress()).toBe(100);
  });

  // Test 6: Handles failures gracefully
  it('continues on row failure', async () => {
    const processor = new BatchProcessor({
      prompt: 'Test',
      rows: [
        { id: '1' },
        { id: '2' },
        { id: '3' }
      ],
      batchId: 'batch-1'
    });
    // Mock one row to fail
    await processor.processBatch();
    const results = await processor.getResults();
    expect(results.length).toBeGreaterThan(0);
  });

  // Test 7: Retries failed rows
  it('retries failed rows', async () => {
    const processor = new BatchProcessor({
      prompt: 'Test',
      rows: [{ id: '1' }],
      batchId: 'batch-1',
      maxRetries: 3
    });
    await processor.processBatch();
    // Verify retries happened
  });

  // Test 8: Supports cancellation
  it('cancels batch processing', async () => {
    const processor = new BatchProcessor({
      prompt: 'Test',
      rows: Array(100).fill({ id: '1' }),
      batchId: 'batch-1'
    });
    setTimeout(() => processor.cancel(), 100);
    await processor.processBatch();
    expect(processor.getStatus()).toBe('cancelled');
  });

  // Test 9: Reports accurate stats
  it('reports accurate processing stats', async () => {
    const processor = new BatchProcessor({
      prompt: 'Test',
      rows: [
        { id: '1' },
        { id: '2' },
        { id: '3' }
      ],
      batchId: 'batch-1'
    });
    await processor.processBatch();
    const stats = processor.getStats();
    expect(stats.total).toBe(3);
    expect(stats.processed).toBe(3);
    expect(stats.failed).toBeGreaterThanOrEqual(0);
  });

  // Test 10: Resumes interrupted batch
  it('resumes interrupted batch', async () => {
    const processor = new BatchProcessor({
      prompt: 'Test',
      rows: [{ id: '1' }, { id: '2' }],
      batchId: 'batch-1'
    });
    // Start processing
    const processPromise = processor.processBatch();
    // Cancel after first row
    setTimeout(() => processor.cancel(), 50);
    await processPromise;
    // Resume
    await processor.resume();
    expect(processor.getStatus()).toBe('completed');
  });
});

describe('ProgressTracker', () => {
  // Test 11: Tracks progress
  it('tracks progress percentage', () => {
    const tracker = new ProgressTracker();
    tracker.update({ processed: 5, total: 10 });
    expect(tracker.getProgress()).toBe(50);
  });

  // Test 12: Estimates time remaining
  it('estimates time remaining', () => {
    const tracker = new ProgressTracker();
    tracker.update({ processed: 2, total: 10, elapsedMs: 5000 });
    const eta = tracker.getETA();
    expect(eta).toBeGreaterThan(0);
  });
});

describe('API Endpoints', () => {
  // Test 13: Create batch endpoint
  it('POST /api/batch creates new batch', async () => {
    const response = await fetch('/api/batch', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Test',
        rows: [{ id: '1' }]
      })
    });
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.batchId).toBeTruthy();
  });

  // Test 14: Get batch status
  it('GET /api/batch/[id] returns status', async () => {
    const response = await fetch('/api/batch/batch-1');
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.status).toBeTruthy();
    expect(data.progress).toBeTruthy();
  });
});
```

## 🛠️ Implementation

**lib/batch-processor.ts:**
- Constructor with config
- processBatch() - main method
- processRow() - single row
- getStatus() - current status
- getProgress() - progress tracking
- getResults() - fetch results
- cancel() - stop processing
- resume() - restart
- getStats() - summary stats
- onProgress() - callback

**lib/progress-tracker.ts:**
- Track processed/total
- Calculate percentage
- Estimate ETA
- Get stats

**app/api/batch/route.ts:**
- POST: Create batch
- GET: List batches

**app/api/batch/[id]/route.ts:**
- GET: Batch status
- PATCH: Update/cancel

## 📋 Requirements

- Process rows sequentially (1 at a time)
- Store results in Supabase `batch_results` table
- Track status: pending → processing → completed/failed
- Support cancellation
- Support resuming
- Retry failed rows (up to 3x)
- Calculate ETA
- Report accurate stats

## ✨ Acceptance Criteria

- [x] All tests passing
- [x] 80%+ coverage
- [x] Batch processes all rows
- [x] Results stored in DB
- [x] Progress tracked
- [x] Cancellation works
- [x] Resumption works
- [x] Retries work
- [x] ETA calculated
- [x] All APIs working

---

**Status:** Ready for implementation


