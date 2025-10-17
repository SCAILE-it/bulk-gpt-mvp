# TASK 4: Gemini API Integration - TDD Approach

**Model:** DeepSeek-33B + Qwen-32B (parallel execution)  
**Complexity:** Complex  
**Estimated Time:** 3 hours  
**Approach:** Test-Driven Development (tests first)

---

## 📋 Task Overview

Build production-grade Gemini API integration with streaming support, error handling, and rate limiting.

## 🏗️ Architecture

```
lib/
├── gemini.ts               (Gemini client wrapper)
└── __tests__/
    └── gemini.test.ts      (Tests)

app/api/
└── process/
    └── route.ts            (API endpoint for processing)
```

## 📝 Requirements

### Gemini Client (`lib/gemini.ts`)
```typescript
interface GeminiClient {
  // Initialize with API key
  initialize(apiKey: string): void
  
  // Process single row with streaming
  processRow(prompt: string, data: Record<string, string>): Promise<string>
  
  // Handle streaming responses
  streamResponse(prompt: string): AsyncGenerator<string>
  
  // Retry logic for failed requests
  retryWithBackoff(fn: () => Promise<string>, maxRetries: 3): Promise<string>
  
  // Rate limiting
  checkRateLimit(): boolean
}
```

### API Endpoint (`app/api/process/route.ts`)
- POST endpoint for processing rows
- Accept: `{ prompt: string, rows: Record<string, string>[] }`
- Return: Streamed responses
- Error handling with retries
- Rate limiting checks

### Requirements
- Use Vercel AI SDK for streaming
- Support chunked responses
- Error handling + exponential backoff
- Rate limit tracking (max 60 requests/min)
- Request timeout (30 seconds)
- Type-safe responses

## ✅ STEP 1: WRITE TESTS FIRST (TDD)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient } from '../gemini';

describe('GeminiClient', () => {
  let client: GeminiClient;

  beforeEach(() => {
    client = new GeminiClient();
  });

  // Test 1: Initialize with API key
  it('initializes with API key', () => {
    expect(() => client.initialize('test-key')).not.toThrow();
  });

  // Test 2: Process single row
  it('processes single row and returns result', async () => {
    client.initialize('test-key');
    const result = await client.processRow(
      'Analyze: {{name}}',
      { name: 'John', email: 'john@test.com' }
    );
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  // Test 3: Handles template variables
  it('replaces template variables in prompt', async () => {
    client.initialize('test-key');
    const result = await client.processRow(
      'Email: {{email}}',
      { email: 'test@example.com' }
    );
    expect(result).not.toContain('{{email}}');
  });

  // Test 4: Streaming support
  it('streams responses', async () => {
    client.initialize('test-key');
    const chunks: string[] = [];
    for await (const chunk of client.streamResponse('Test prompt')) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  // Test 5: Retry logic
  it('retries failed requests', async () => {
    client.initialize('test-key');
    let attempts = 0;
    const fn = () => {
      attempts++;
      if (attempts < 3) throw new Error('Temp failure');
      return Promise.resolve('success');
    };
    const result = await client.retryWithBackoff(fn, 3);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  // Test 6: Max retries exceeded
  it('throws after max retries exceeded', async () => {
    client.initialize('test-key');
    const fn = () => Promise.reject(new Error('Persistent error'));
    await expect(client.retryWithBackoff(fn, 2)).rejects.toThrow();
  });

  // Test 7: Rate limiting
  it('enforces rate limits', () => {
    client.initialize('test-key');
    // Make 61 rapid requests
    for (let i = 0; i < 60; i++) {
      client.checkRateLimit();
    }
    expect(client.checkRateLimit()).toBe(false);
  });

  // Test 8: Resets rate limit after time window
  it('resets rate limit after time window', async () => {
    client.initialize('test-key');
    for (let i = 0; i < 60; i++) {
      client.checkRateLimit();
    }
    expect(client.checkRateLimit()).toBe(false);
    // Wait for rate limit window
    await new Promise(resolve => setTimeout(resolve, 61000));
    expect(client.checkRateLimit()).toBe(true);
  });

  // Test 9: Handles API errors
  it('handles API errors gracefully', async () => {
    client.initialize('invalid-key');
    await expect(
      client.processRow('Test', { key: 'value' })
    ).rejects.toThrow();
  });

  // Test 10: Timeout handling
  it('times out long-running requests', async () => {
    client.initialize('test-key');
    const slowPromise = client.processRow(
      'Long task',
      { key: 'value' }
    );
    await expect(
      Promise.race([
        slowPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 30000)
        )
      ])
    ).rejects.toThrow('Timeout');
  });
});

// API endpoint tests
describe('POST /api/process', () => {
  // Test 11: Accepts POST with correct body
  it('accepts POST request with prompt and rows', async () => {
    const response = await fetch('/api/process', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Analyze: {{name}}',
        rows: [{ name: 'John' }]
      })
    });
    expect(response.ok).toBe(true);
  });

  // Test 12: Returns streaming response
  it('returns streamed response', async () => {
    const response = await fetch('/api/process', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Test',
        rows: [{ key: 'value' }]
      })
    });
    expect(response.headers.get('content-type')).toContain('stream');
  });

  // Test 13: Error handling
  it('returns 400 for missing prompt', async () => {
    const response = await fetch('/api/process', {
      method: 'POST',
      body: JSON.stringify({
        rows: [{ key: 'value' }]
      })
    });
    expect(response.status).toBe(400);
  });
});
```

## 🛠️ STEP 2: IMPLEMENT (After tests pass)

### File: `lib/gemini.ts`

Implement:
1. Initialize with API key from environment
2. Template variable replacement (`{{variable}}`)
3. Gemini API calls (use `@google/generative-ai`)
4. Streaming via AsyncGenerator
5. Exponential backoff retry (3 attempts, 1s/2s/4s delays)
6. Rate limiting (60 requests/minute)
7. Error handling with BulkGPTError
8. Type-safe responses

### File: `app/api/process/route.ts`

Implement:
1. Parse request body
2. Validate prompt + rows
3. Call Gemini client
4. Stream responses back
5. Handle errors with proper HTTP codes
6. Add rate limit headers

### Dependencies (Already in package.json)
- `@google/generative-ai` - Gemini API
- `ai` (Vercel AI SDK) - Streaming

## 📋 Acceptance Criteria

- [x] Gemini client initializes
- [x] Process single row works
- [x] Template variables replaced
- [x] Streaming support works
- [x] Retry logic working (max 3 attempts)
- [x] Rate limiting enforced (60/min)
- [x] Error handling graceful
- [x] Timeout handling (30s)
- [x] API endpoint working
- [x] All tests passing (80%+ coverage)
- [x] TypeScript strict mode
- [x] No console errors

## 🚀 Instructions

### Step 1: Create test file
```bash
# Create: lib/__tests__/gemini.test.ts
# Paste test code above
```

### Step 2: Run tests (will fail - expected)
```bash
npm test -- gemini.test.ts
```

### Step 3: Implement lib/gemini.ts
- Initialize Gemini client
- Implement processRow()
- Implement streaming
- Implement retry logic
- Implement rate limiting

### Step 4: Implement API endpoint
- Create app/api/process/route.ts
- Handle POST requests
- Stream responses

### Step 5: Validate
```bash
npm run type-check
npm run lint
npm test -- gemini.test.ts
```

## 📚 Resources

- **Gemini API:** https://ai.google.dev/tutorials/get_started_web
- **Vercel AI SDK:** https://sdk.vercel.ai/
- **Types:** Import from `lib/types.ts`
- **Errors:** Use `BulkGPTError` from `lib/errors.ts`

---

**Status:** Ready for implementation  
**Review Criteria:** All tests passing + 80%+ coverage


