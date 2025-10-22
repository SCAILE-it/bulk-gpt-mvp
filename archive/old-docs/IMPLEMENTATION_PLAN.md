# 11/10 Power User Implementation Plan

**Target:** n8n users who need speed, reliability, and automation
**Goal:** Transform bulk-gpt-app into professional-grade power tool
**Budget:** ~500 lines total
**Principles:** Iterative, test-driven, DRY, SOLID, KISS, minimal

---

## 🎯 Success Metrics

- [ ] **Speed:** 1000 rows: 60s → 10s (6x faster via parallel processing)
- [ ] **Reliability:** Auto-retry failed rows (95%+ success rate)
- [ ] **Real-time:** Stream results as processed (instant feedback)
- [ ] **Integration:** Webhook support for n8n/Zapier
- [ ] **API-first:** Token auth + curl examples
- [ ] **UX:** Keyboard shortcuts + live monitoring

---

## 📐 Architecture Overview

### Current Flow
```
User → Upload CSV → Configure → POST /api/process → Modal (sequential) → Poll results
```

### New Flow (11/10)
```
User → Upload CSV → Configure → POST /api/process/stream
                                       ↓
                          Modal (parallel + streaming)
                                       ↓
                          EventSource stream → Live results
                                       ↓
                          On complete → Webhook callback
```

### Tech Stack
- **Frontend:** Next.js 14, React 18, TypeScript
- **Backend:** Next.js API Routes, Modal.com (Python)
- **Database:** Supabase (PostgreSQL)
- **Streaming:** Server-Sent Events (SSE)
- **Testing:** Playwright (E2E on VM)

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "p-limit": "^5.0.0"  // Concurrency control for parallel processing
  }
}
```

---

## 🔄 Implementation Phases

### ✅ Phase 0: Pre-Implementation Setup
**Status:** 🔲 Not Started
**Lines:** 0
**Time:** 15 minutes

#### Tasks
- [ ] Create this implementation plan
- [ ] Set up git branch: `git checkout -b feat/power-user-11-10`
- [ ] Install dependencies: `npm install p-limit`
- [ ] Review current codebase structure
- [ ] Set up testing environment on VM

#### Success Criteria
- Branch created
- Dependencies installed
- VM dev server running
- Baseline tests passing

---

### 🎨 Phase 1: UX/Design System Transformation
**Status:** 🔲 Not Started
**Priority:** 🔴 CRITICAL (sets foundation for 11/10 feel)
**Lines:** ~90
**Time:** 3 hours

#### Objective
Transform from consumer-friendly to power-user aesthetic → n8n/Linear/Retool vibe

#### Current UX Problems
- ❌ Hidden advanced options (collapsed by default)
- ❌ Friendly hand-holding text ("Drop file or browse...")
- ❌ Low information density (too much whitespace)
- ❌ No raw data access (can't see JSON)
- ❌ No copy buttons (manual copy-paste)
- ❌ Generic fonts (not monospace for data)
- ❌ Vague error messages ("Something went wrong")

#### New UX Requirements
- ✅ Advanced always visible (no hiding power features)
- ✅ Direct, technical language (no hand-holding)
- ✅ High information density (show more, use less space)
- ✅ Raw data view (JSON tabs, inspect mode)
- ✅ Copy buttons everywhere (one-click copy)
- ✅ Monospace for data/code (better readability)
- ✅ Real error messages (show actual errors)
- ✅ Keyboard hints (⌘↵ badges on buttons)

---

#### Implementation

**File 1: `lib/design-system/power-user.ts` (NEW - 25 lines)**

Design tokens for power-user UI:

```typescript
/**
 * Power-User Design System
 * Optimized for density, readability, and speed
 */

export const powerUserTheme = {
  // Monospace for data/code
  fonts: {
    mono: 'var(--font-geist-mono), "Courier New", monospace',
    sans: 'var(--font-geist-sans), system-ui, sans-serif',
  },

  // Status colors (accessible, clear)
  status: {
    processing: 'hsl(210, 100%, 50%)',  // Blue
    success: 'hsl(142, 71%, 45%)',       // Green
    error: 'hsl(0, 72%, 51%)',           // Red
    warning: 'hsl(38, 92%, 50%)',        // Orange
    retry: 'hsl(48, 96%, 53%)',          // Yellow
  },

  // Spacing (denser than default)
  spacing: {
    tight: '0.25rem',   // 4px
    compact: '0.5rem',  // 8px
    normal: '0.75rem',  // 12px
    relaxed: '1rem',    // 16px
  },

  // Border radius (subtle)
  radius: {
    sm: '0.25rem',  // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem',   // 8px
  },
}

// Utility for monospace text
export const monoClass = 'font-mono text-[13px] leading-tight'

// Utility for status badges
export const statusBadge = (status: keyof typeof powerUserTheme.status) =>
  `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
    status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
    status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
    status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
    status === 'warning' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  }`
```

**File 2: `components/ui/copy-button.tsx` (NEW - 20 lines)**

Universal copy button component:

```typescript
'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyButtonProps {
  value: string
  label?: string
}

export function CopyButton({ value, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-8 gap-1"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </Button>
  )
}
```

**File 3: `components/ui/keyboard-hint.tsx` (NEW - 15 lines)**

Keyboard shortcut badge:

```typescript
interface KeyboardHintProps {
  keys: string[]  // e.g., ['⌘', 'Enter'] or ['Ctrl', 'K']
  className?: string
}

export function KeyboardHint({ keys, className }: KeyboardHintProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
      "bg-muted/50 text-muted-foreground border border-border/50",
      className
    )}>
      {keys.map((key, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-0.5 text-muted-foreground/50">+</span>}
          <kbd className="font-sans">{key}</kbd>
        </span>
      ))}
    </span>
  )
}
```

**File 4: Edit `components/wizard/StepUpload.tsx` (+15 lines)**

Power-user UX changes:

```typescript
// Line 150 - Replace friendly messaging with direct info
// OLD: "Drop CSV file here or click to browse"
// NEW: Just the essentials

<div className="space-y-4">
  {/* Show row count LARGE */}
  {csvData && (
    <div className="flex items-baseline gap-2">
      <span className="text-5xl font-bold tabular-nums">{csvData.rowCount.toLocaleString()}</span>
      <span className="text-muted-foreground">rows</span>
    </div>
  )}

  {/* Add Raw JSON view */}
  {csvData && (
    <Tabs defaultValue="preview">
      <TabsList>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="json">Raw JSON</TabsTrigger>
      </TabsList>
      <TabsContent value="preview">
        {/* Existing table preview */}
      </TabsContent>
      <TabsContent value="json" className="relative">
        <CopyButton
          value={JSON.stringify({ headers: csvData.headers, rowCount: csvData.rowCount }, null, 2)}
          className="absolute top-2 right-2"
        />
        <pre className={cn(monoClass, "p-4 bg-muted rounded overflow-x-auto")}>
          {JSON.stringify({ headers: csvData.headers, rowCount: csvData.rowCount }, null, 2)}
        </pre>
      </TabsContent>
    </Tabs>
  )}
</div>
```

**File 5: Edit `components/wizard/StepConfigure.tsx` (+20 lines)**

Power-user UX changes:

```typescript
// Line 45 - Change default to ALWAYS show advanced
const [showAdvanced, setShowAdvanced] = useState(true)  // Changed from false

// Remove the "Advanced Options" collapsible - just show everything
// Delete ~15 lines of collapsible wrapper

// Add keyboard hints to buttons
<Button onClick={handleNext} disabled={!validation.isValid}>
  Continue
  <KeyboardHint keys={['⌘', '↵']} className="ml-2" />
</Button>

// Add copy button for prompt template
<div className="relative">
  <Label htmlFor="prompt">Prompt Template</Label>
  <CopyButton
    value={promptTemplate}
    className="absolute top-0 right-0"
  />
  <Textarea
    id="prompt"
    ref={textareaRef}
    value={promptTemplate}
    onChange={(e) => handlePromptChange(e.target.value)}
    className={cn(monoClass, "min-h-32")}  // Monospace font
  />
</div>

// Show variable detection more prominently
{validation.foundVariables.length > 0 && (
  <div className="flex gap-1 flex-wrap">
    {validation.foundVariables.map(v => (
      <span key={v} className={statusBadge('success')}>
        {v}
      </span>
    ))}
  </div>
)}
```

**File 6: Edit `components/wizard/StepResults.tsx` (+15 lines)**

Power-user UX changes:

```typescript
// Add monospace to all data displays
<div className={monoClass}>
  Row {idx}: {result.output}
</div>

// Add copy button for results
<CopyButton
  value={JSON.stringify(results, null, 2)}
  label="Copy all results"
/>

// Show errors with actual messages (not vague)
{result.error && (
  <div className="text-xs text-red-600 font-mono">
    Error: {result.error}  {/* Actual error, not "something went wrong" */}
  </div>
)}
```

**File 7: Edit `tailwind.config.ts` (+5 lines)**

Add monospace font:

```typescript
theme: {
  extend: {
    fontFamily: {
      mono: ['var(--font-geist-mono)', 'Courier New', 'monospace'],
    },
  },
}
```

---

#### Files Changed
- ✅ Create `lib/design-system/power-user.ts` (NEW - 25 lines)
- ✅ Create `components/ui/copy-button.tsx` (NEW - 20 lines)
- ✅ Create `components/ui/keyboard-hint.tsx` (NEW - 15 lines)
- ✅ Edit `components/wizard/StepUpload.tsx` (+15 lines)
- ✅ Edit `components/wizard/StepConfigure.tsx` (+20 lines)
- ✅ Edit `components/wizard/StepResults.tsx` (+15 lines)
- ✅ Edit `tailwind.config.ts` (+5 lines)

Total: ~115 lines (slightly over budget but worth it)

---

#### Testing

**Test File: `playwright-tests/power-user-ux.spec.ts` (NEW)**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Power User UX', () => {
  test('shows row count prominently', async ({ page }) => {
    await page.goto('http://localhost:5173/wizard')
    await page.setInputFiles('input[type="file"]', 'test-data/100-rows.csv')

    // Row count should be large and visible
    await expect(page.locator('text=/100/')).toBeVisible()
    await expect(page.locator('text=/100/').first()).toHaveCSS('font-size', /4[0-9]px/)  // ~40-50px
  })

  test('shows raw JSON view', async ({ page }) => {
    await page.setInputFiles('input[type="file"]', 'test-data/sample.csv')

    // Click Raw JSON tab
    await page.click('text=Raw JSON')

    // Should show JSON
    await expect(page.locator('pre')).toContainText('"headers"')
    await expect(page.locator('pre')).toContainText('"rowCount"')

    // Copy button should work
    await page.click('button:has-text("Copy")')
    await expect(page.locator('button:has-text("Copied")')).toBeVisible()
  })

  test('advanced options always visible', async ({ page }) => {
    await page.goto('http://localhost:5173/wizard?step=2')

    // Context and output columns should be visible immediately (no expanding)
    await expect(page.locator('label:has-text("Context")')).toBeVisible()
    await expect(page.locator('label:has-text("Output Columns")')).toBeVisible()
  })

  test('shows keyboard hints', async ({ page }) => {
    await page.goto('http://localhost:5173/wizard')

    // Continue button should have keyboard hint
    await expect(page.locator('kbd:has-text("⌘")')).toBeVisible()
    await expect(page.locator('kbd:has-text("↵")')).toBeVisible()
  })

  test('uses monospace for data', async ({ page }) => {
    await page.setInputFiles('input[type="file"]', 'test-data/sample.csv')

    // Check that data uses monospace font
    const dataElement = page.locator('pre').first()
    await expect(dataElement).toHaveCSS('font-family', /mono/)
  })

  test('shows real error messages', async ({ page }) => {
    // Trigger an error
    await page.setInputFiles('input[type="file"]', 'test-data/invalid.csv')

    // Should show actual error, not vague message
    const errorText = await page.locator('[role="alert"]').textContent()
    expect(errorText).not.toContain('Something went wrong')
    expect(errorText).not.toContain('Oops')
  })
})
```

---

#### Success Criteria
- [ ] Row count displayed large (40-50px font)
- [ ] Raw JSON view available with copy button
- [ ] Advanced options visible by default (no collapsing)
- [ ] Keyboard hints visible on buttons (⌘↵)
- [ ] Monospace font for all data/code
- [ ] Real error messages (no vague "oops")
- [ ] Copy buttons on prompt, results, JSON
- [ ] Dense layout (more info, less whitespace)

---

#### Visual Comparison

**Before (Consumer-friendly):**
```
┌─────────────────────────────────┐
│                                 │
│   Drop CSV file here            │
│   or click to browse            │
│                                 │
│   Max 10MB • 10K rows          │
│                                 │
└─────────────────────────────────┘

5 rows loaded ✓

Advanced Options ▼  (collapsed)
```

**After (Power-user):**
```
┌────────────────────┐
│ 5,247 rows         │  (large, bold)
└────────────────────┘

┌─ Preview ─┬─ Raw JSON ─┐ Copy
│                         │
│ name,email,company      │
│ Alice,a@ex.com,Acme     │
│                         │
└─────────────────────────┘

Context  (always visible)
Output Columns  (always visible)

Continue  [⌘ ↵]
```

---

#### Why This is Critical for 11/10

n8n users expect:
- **Information density** - See everything at a glance
- **Raw data access** - Inspect, debug, verify
- **No hand-holding** - Direct, technical language
- **Copy everywhere** - One-click to Slack/Notion/code
- **Keyboard-first** - Visual hints for shortcuts
- **Real errors** - Actual messages, not "oops"

This phase sets the **visual foundation** for feeling like a professional tool, not a consumer app.

---

### 🚀 Phase 2: Parallel Processing
**Status:** 🔲 Not Started
**Priority:** 🔴 CRITICAL (biggest impact)
**Lines:** ~50
**Time:** 2 hours

#### Objective
Process rows in parallel with concurrency control → 6x speed improvement

#### Current Implementation
```typescript
// app/api/process/route.ts - Line 109
// Sequential processing via Modal (slow)
await invokeModalAsync(modalUrl, batchId, rows, prompt, context, outputColumns)
```

#### New Implementation

**File 1: `lib/utils/parallel.ts` (NEW - 20 lines)**
```typescript
import pLimit from 'p-limit'

export interface ParallelConfig {
  concurrency?: number // Default: 10
  onProgress?: (current: number, total: number) => void
  onError?: (error: Error, index: number) => void
}

export async function processInParallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  config: ParallelConfig = {}
): Promise<PromiseSettledResult<R>[]> {
  const { concurrency = 10, onProgress, onError } = config
  const limit = pLimit(concurrency)

  const promises = items.map((item, idx) =>
    limit(async () => {
      try {
        const result = await processor(item, idx)
        onProgress?.(idx + 1, items.length)
        return result
      } catch (error) {
        onError?.(error as Error, idx)
        throw error
      }
    })
  )

  return Promise.allSettled(promises)
}
```

**File 2: Edit `modal-processor/main.py` (+30 lines)**

Add parallel processing to Modal function:

```python
import asyncio
from typing import List, Dict

@app.function(
    timeout=600,
    concurrency_limit=100  # Allow up to 100 concurrent batches
)
@web_endpoint(method="POST")
async def process_batch_parallel(request: dict) -> dict:
    batch_id = request.get("batch_id")
    rows = request.get("rows", [])
    prompt = request.get("prompt")
    context = request.get("context", "")
    concurrency = request.get("concurrency", 10)  # NEW: configurable

    # Create semaphore for concurrency control
    semaphore = asyncio.Semaphore(concurrency)

    async def process_with_limit(row: dict, row_index: int):
        async with semaphore:
            return await process_single_row(
                batch_id=batch_id,
                row=row,
                row_index=row_index,
                prompt=prompt,
                context=context
            )

    # Process all rows in parallel
    tasks = [
        process_with_limit(row, idx)
        for idx, row in enumerate(rows)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    return {
        "status": "completed",
        "batch_id": batch_id,
        "processed": len(results)
    }
```

**File 3: Edit `app/api/process/route.ts` (+15 lines)**

Add concurrency parameter:

```typescript
// Line 69 - Add concurrency to request body
const {
  csvFilename,
  rows,
  prompt,
  context = '',
  outputColumns = [],
  concurrency = 10  // NEW: default to 10 concurrent requests
} = body

// Line 160 - Pass concurrency to Modal
body: JSON.stringify({
  batch_id: batchId,
  rows,
  prompt,
  context,
  output_schema: outputColumns,
  concurrency  // NEW
}),
```

#### Files Changed
- ✅ Create `lib/utils/parallel.ts` (NEW - 20 lines)
- ✅ Edit `modal-processor/main.py` (+30 lines)
- ✅ Edit `app/api/process/route.ts` (+5 lines)

#### Testing

**Test File: `playwright-tests/parallel-processing.spec.ts` (NEW)**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Parallel Processing', () => {
  test('processes 100 rows in under 15 seconds', async ({ page }) => {
    // Upload CSV with 100 rows
    await page.goto('http://localhost:5173/wizard')
    await page.setInputFiles('input[type="file"]', 'test-data/100-rows.csv')
    await page.click('text=Continue')

    // Configure
    await page.fill('textarea[name="prompt"]', 'Generate bio for {{name}}')

    // Start processing and measure time
    const startTime = Date.now()
    await page.click('text=Start Processing')

    // Wait for completion
    await page.waitForSelector('text=Processing Complete', { timeout: 30000 })

    const elapsed = Date.now() - startTime
    expect(elapsed).toBeLessThan(15000) // Should complete in under 15s
  })

  test('respects concurrency limit', async ({ request }) => {
    const response = await request.post('/api/process', {
      data: {
        csvFilename: 'test.csv',
        rows: Array(50).fill({ name: 'Test' }),
        prompt: 'Test {{name}}',
        concurrency: 5  // Limit to 5 concurrent
      }
    })

    expect(response.status()).toBe(202)
  })
})
```

#### Success Criteria
- [ ] 100 rows process in <15s (currently ~60s)
- [ ] Concurrency parameter configurable (5, 10, 20)
- [ ] Modal handles parallel requests without errors
- [ ] Tests pass on VM
- [ ] No increase in error rate

#### Risks & Mitigation
- **Risk:** Modal rate limits
  - **Mitigation:** Default concurrency=10, max=20
- **Risk:** Memory issues with large batches
  - **Mitigation:** Semaphore limits concurrent execution

---

### 🔄 Phase 2: Error Recovery & Retry
**Status:** 🔲 Not Started
**Priority:** 🔴 CRITICAL (reliability)
**Lines:** ~40
**Time:** 1.5 hours

#### Objective
Auto-retry failed rows with exponential backoff → 95%+ success rate

#### Implementation

**File 1: `lib/utils/retry.ts` (NEW - 25 lines)**

```typescript
export interface RetryConfig {
  maxRetries?: number  // Default: 3
  initialDelay?: number  // Default: 1000ms
  maxDelay?: number  // Default: 10000ms
  backoffMultiplier?: number  // Default: 2
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = config

  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        )
        await sleep(delay)
      }
    }
  }

  throw lastError!
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

**File 2: Edit `modal-processor/main.py` (+15 lines)**

```python
async def process_with_retry(
    batch_id: str,
    row: dict,
    row_index: int,
    prompt: str,
    context: str,
    max_retries: int = 3
):
    """Process a single row with retry logic"""
    last_error = None

    for attempt in range(max_retries):
        try:
            result = await process_single_row(
                batch_id=batch_id,
                row=row,
                row_index=row_index,
                prompt=prompt,
                context=context
            )

            # Success - update with attempt count
            if attempt > 0:
                result['retry_count'] = attempt

            return result

        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                # Exponential backoff: 1s, 2s, 4s
                await asyncio.sleep(1 * (2 ** attempt))
                print(f"Retry {attempt + 1}/{max_retries} for row {row_index}")
            else:
                # Final failure - log to database
                await log_failure(batch_id, row_index, str(e))

    raise last_error
```

#### Files Changed
- ✅ Create `lib/utils/retry.ts` (NEW - 25 lines)
- ✅ Edit `modal-processor/main.py` (+15 lines)

#### Testing

```typescript
test('retries failed rows up to 3 times', async ({ page }) => {
  // Mock API to fail twice then succeed
  await page.route('**/api/gemini', (route, request) => {
    const callCount = parseInt(request.headers()['x-call-count'] || '0')
    if (callCount < 2) {
      route.abort('failed')
    } else {
      route.fulfill({ status: 200, body: JSON.stringify({ result: 'success' }) })
    }
  })

  await page.click('text=Start Processing')
  await page.waitForSelector('text=Processing Complete')

  // Should show retry count
  await expect(page.locator('text=/Retried: 2/')).toBeVisible()
})
```

#### Success Criteria
- [ ] Failed API calls retry automatically
- [ ] Exponential backoff: 1s, 2s, 4s delays
- [ ] Max 3 retries per row
- [ ] Retry count tracked and displayed
- [ ] Success rate >95% on flaky network

---

### 📡 Phase 3: Streaming Results (SSE)
**Status:** 🔲 Not Started
**Priority:** 🟡 HIGH (UX improvement)
**Lines:** ~80
**Time:** 2.5 hours

#### Objective
Stream results in real-time as they're processed → instant feedback

#### Implementation

**File 1: `app/api/process/stream/route.ts` (NEW - 40 lines)**

```typescript
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 300 // 5 minutes

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const body = await req.json()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'started',
            total: body.rows.length
          })}\n\n`)
        )

        // Process rows and stream results
        const results = await processWithStreaming(body, (event) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        })

        // Send completion event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'completed',
            results
          })}\n\n`)
        )

        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: error.message
          })}\n\n`)
        )
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

async function processWithStreaming(
  body: any,
  onEvent: (event: any) => void
) {
  // Call Modal with streaming callback
  // Modal will call our webhook endpoint for each completed row
  // We'll poll and stream updates to client

  // Implementation details...
  return []
}
```

**File 2: `hooks/useStreamingResults.ts` (NEW - 10 lines)**

```typescript
import { useEffect, useState } from 'react'

export function useStreamingResults(config: any) {
  const [results, setResults] = useState<any[]>([])
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'streaming' | 'completed'>('idle')

  useEffect(() => {
    if (!config) return

    const eventSource = new EventSource('/api/process/stream')

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'started') {
        setStatus('streaming')
      } else if (data.type === 'row_completed') {
        setResults(prev => [...prev, data.result])
        setProgress(data.current / data.total * 100)
      } else if (data.type === 'completed') {
        setStatus('completed')
      }
    }

    return () => eventSource.close()
  }, [config])

  return { results, progress, status }
}
```

**File 3: Edit `components/wizard/StepResults.tsx` (+30 lines)**

```typescript
// Replace static results loading with streaming
const { results, progress, status } = useStreamingResults(processingConfig)

return (
  <div className="space-y-4">
    {/* Live progress */}
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Processing...</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} />
    </div>

    {/* Results appear in real-time */}
    <div className="space-y-2">
      {results.map((result, idx) => (
        <div
          key={idx}
          className="p-2 border rounded animate-in fade-in slide-in-from-bottom-2"
        >
          Row {result.rowIndex}: {result.output}
        </div>
      ))}
    </div>
  </div>
)
```

#### Files Changed
- ✅ Create `app/api/process/stream/route.ts` (NEW - 40 lines)
- ✅ Create `hooks/useStreamingResults.ts` (NEW - 10 lines)
- ✅ Edit `components/wizard/StepResults.tsx` (+30 lines)

#### Testing

```typescript
test('streams results in real-time', async ({ page }) => {
  await page.click('text=Start Processing')

  // First result should appear within 2 seconds
  await expect(page.locator('[data-result-row]').first())
    .toBeVisible({ timeout: 2000 })

  // Progress bar should update
  await expect(page.locator('[role="progressbar"]'))
    .toHaveAttribute('aria-valuenow', /[1-9]\d*/)

  // All 10 results should stream in
  await expect(page.locator('[data-result-row]'))
    .toHaveCount(10, { timeout: 15000 })
})
```

#### Success Criteria
- [ ] First result visible within 2s of starting
- [ ] Progress updates in real-time
- [ ] Results appear one-by-one as processed
- [ ] Smooth animations for new results
- [ ] Connection handles errors gracefully

---

### 🔗 Phase 4: Webhook Integration
**Status:** 🔲 Not Started
**Priority:** 🟡 HIGH (automation)
**Lines:** ~60
**Time:** 1.5 hours

#### Objective
POST results to webhook URL on completion → n8n/Zapier integration

#### Implementation

**File 1: `lib/utils/webhook.ts` (NEW - 20 lines)**

```typescript
export async function callWebhook(
  url: string,
  payload: any,
  retries = 3
): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BulkGPT/1.0'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`)
      }

      return // Success
    } catch (error) {
      if (attempt === retries - 1) {
        // Log failure but don't throw
        console.error('Webhook failed after retries:', error)
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}
```

**File 2: Edit `app/api/process/route.ts` (+25 lines)**

```typescript
// Line 69 - Add webhook URL to config
const {
  csvFilename,
  rows,
  prompt,
  context = '',
  outputColumns = [],
  concurrency = 10,
  webhookUrl  // NEW
} = body

// After processing completes (in success callback)
if (webhookUrl) {
  await callWebhook(webhookUrl, {
    event: 'batch.completed',
    batch_id: batchId,
    status: 'completed',
    results: {
      total: rows.length,
      successful: successCount,
      failed: failedCount
    },
    timestamp: new Date().toISOString()
  })
}
```

**File 3: Edit `components/wizard/StepConfigure.tsx` (+15 lines)**

```typescript
// Add webhook URL field to Advanced Options section
<div className="space-y-2">
  <Label htmlFor="webhookUrl">
    Webhook URL (optional)
  </Label>
  <Input
    id="webhookUrl"
    type="url"
    placeholder="https://hooks.zapier.com/hooks/catch/..."
    value={webhookUrl}
    onChange={(e) => setWebhookUrl(e.target.value)}
  />
  <p className="text-xs text-muted-foreground">
    POST results to this URL when processing completes.
    Perfect for n8n, Zapier, Make.com workflows.
  </p>
</div>
```

#### Files Changed
- ✅ Create `lib/utils/webhook.ts` (NEW - 20 lines)
- ✅ Edit `app/api/process/route.ts` (+25 lines)
- ✅ Edit `components/wizard/StepConfigure.tsx` (+15 lines)

#### Testing

```typescript
test('calls webhook on completion', async ({ page }) => {
  // Set up webhook mock
  const webhookCalls = []
  await page.route('**/hooks.zapier.com/**', (route, request) => {
    webhookCalls.push(JSON.parse(request.postData()))
    route.fulfill({ status: 200 })
  })

  // Configure webhook
  await page.fill('#webhookUrl', 'https://hooks.zapier.com/test')
  await page.click('text=Start Processing')

  // Wait for completion
  await page.waitForSelector('text=Processing Complete')

  // Verify webhook was called
  expect(webhookCalls).toHaveLength(1)
  expect(webhookCalls[0]).toMatchObject({
    event: 'batch.completed',
    status: 'completed'
  })
})
```

#### Success Criteria
- [ ] Webhook URL field in configuration
- [ ] Webhook called on batch completion
- [ ] Payload includes batch_id, status, results
- [ ] Retries up to 3 times on failure
- [ ] Failures logged but don't block processing

---

### 📊 Phase 5: Live Monitoring Dashboard
**Status:** 🔲 Not Started
**Priority:** 🟢 MEDIUM (polish)
**Lines:** ~50
**Time:** 2 hours

#### Objective
Real-time metrics and activity log → visibility into processing

#### Implementation

**File 1: `hooks/useProcessingMetrics.ts` (NEW - 10 lines)**

```typescript
export function useProcessingMetrics(results: any[]) {
  const [metrics, setMetrics] = useState({
    rowsPerSecond: 0,
    estimatedTimeRemaining: 0
  })

  useEffect(() => {
    // Calculate based on results array growth rate
    // ...implementation
  }, [results])

  return metrics
}
```

**File 2: Edit `components/wizard/StepResults.tsx` (+40 lines)**

Add monitoring dashboard:

```typescript
const { rowsPerSecond, estimatedTimeRemaining } = useProcessingMetrics(results)

<div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg font-mono">
  <div>
    <div className="text-xs text-muted-foreground">Processed</div>
    <div className="text-2xl font-bold">{completed}/{total}</div>
  </div>

  <div>
    <div className="text-xs text-muted-foreground">Speed</div>
    <div className="text-2xl font-bold">{rowsPerSecond.toFixed(1)}/s</div>
  </div>

  <div>
    <div className="text-xs text-muted-foreground">Failed</div>
    <div className="text-2xl font-bold text-red-600">{failed}</div>
  </div>

  <div>
    <div className="text-xs text-muted-foreground">ETA</div>
    <div className="text-2xl font-bold">{formatTime(estimatedTimeRemaining)}</div>
  </div>
</div>

{/* Activity log */}
<div className="space-y-1 font-mono text-xs h-48 overflow-y-auto">
  {activityLog.map(entry => (
    <div key={entry.id} className="flex gap-2 text-muted-foreground">
      <span>{entry.timestamp}</span>
      <span>{entry.message}</span>
    </div>
  ))}
</div>
```

#### Files Changed
- ✅ Create `hooks/useProcessingMetrics.ts` (NEW - 10 lines)
- ✅ Edit `components/wizard/StepResults.tsx` (+40 lines)

#### Testing

```typescript
test('shows real-time metrics', async ({ page }) => {
  await page.click('text=Start Processing')

  // Speed metric should appear
  await expect(page.locator('text=/\\d+\\.\\d+\\/s/')).toBeVisible()

  // ETA should update
  await expect(page.locator('text=/\\d+s remaining/')).toBeVisible()

  // Activity log should show entries
  await expect(page.locator('[data-activity-log] > div')).toHaveCount(5, {
    timeout: 10000
  })
})
```

#### Success Criteria
- [ ] Real-time rows/second calculation
- [ ] ETA updates dynamically
- [ ] Failed count highlighted in red
- [ ] Activity log auto-scrolls
- [ ] Metrics accurate within 10%

---

### ⌨️ Phase 6: Keyboard Shortcuts
**Status:** 🔲 Not Started
**Priority:** 🟢 MEDIUM (velocity)
**Lines:** ~30
**Time:** 1 hour

#### Objective
Power user keyboard navigation → faster workflow

#### Implementation

**File 1: `hooks/useWizardKeyboard.ts` (NEW - 25 lines)**

```typescript
interface KeyboardCallbacks {
  onContinue?: () => void
  onBack?: () => void
  onFocusPrompt?: () => void
}

export function useWizardKeyboard(callbacks: KeyboardCallbacks) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl + Enter = Continue/Submit
      if (isMod && e.key === 'Enter') {
        e.preventDefault()
        callbacks.onContinue?.()
      }

      // Cmd/Ctrl + K = Focus prompt
      if (isMod && e.key === 'k') {
        e.preventDefault()
        callbacks.onFocusPrompt?.()
      }

      // Escape = Go back
      if (e.key === 'Escape') {
        callbacks.onBack?.()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [callbacks])
}
```

**File 2: Edit each Step component (+2 lines each = 6 lines)**

```typescript
// StepUpload.tsx
useWizardKeyboard({
  onContinue: handleContinue,
  onBack: () => router.back()
})

// StepConfigure.tsx
useWizardKeyboard({
  onContinue: handleStartProcessing,
  onFocusPrompt: () => promptRef.current?.focus()
})

// StepResults.tsx
useWizardKeyboard({
  onBack: () => router.push('/wizard?step=2')
})
```

#### Files Changed
- ✅ Create `hooks/useWizardKeyboard.ts` (NEW - 25 lines)
- ✅ Edit `components/wizard/StepUpload.tsx` (+2 lines)
- ✅ Edit `components/wizard/StepConfigure.tsx` (+2 lines)
- ✅ Edit `components/wizard/StepResults.tsx` (+2 lines)

#### Testing

```typescript
test('keyboard shortcuts work', async ({ page }) => {
  await page.goto('/wizard')

  // Cmd+Enter to continue from upload
  await page.keyboard.press('Meta+Enter')
  expect(page.url()).toContain('step=2')

  // Cmd+K to focus prompt
  await page.keyboard.press('Meta+K')
  await expect(page.locator('#prompt')).toBeFocused()

  // Escape to go back
  await page.keyboard.press('Escape')
  expect(page.url()).toContain('step=1')
})
```

#### Success Criteria
- [ ] Cmd+Enter advances wizard steps
- [ ] Cmd+K focuses prompt field
- [ ] Escape navigates back
- [ ] Works on both Mac (Cmd) and Windows (Ctrl)
- [ ] Doesn't conflict with browser shortcuts

---

### 🔑 Phase 7: API Token Authentication
**Status:** 🔲 Not Started
**Priority:** 🟢 LOW (nice-to-have)
**Lines:** ~70
**Time:** 2 hours

#### Objective
Generate API tokens for programmatic access → curl/Postman/n8n integration

#### Implementation

**File 1: `app/api/tokens/route.ts` (NEW - 30 lines)**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Generate secure token
  const token = `bgpt_${crypto.randomBytes(32).toString('hex')}`

  // Store hash in database
  const { error } = await supabase
    .from('api_tokens')
    .insert({
      user_id: user.id,
      token_hash: crypto.createHash('sha256').update(token).digest('hex'),
      created_at: new Date().toISOString()
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }

  // Return token ONCE (won't be shown again)
  return NextResponse.json({ token })
}
```

**File 2: `lib/utils/token.ts` (NEW - 15 lines)**

```typescript
import crypto from 'crypto'

export function validateApiToken(token: string): boolean {
  return token.startsWith('bgpt_') && token.length === 69
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
```

**File 3: Edit `components/wizard/StepConfigure.tsx` (+20 lines)**

Add API documentation section:

```typescript
<Collapsible title="🔌 Use via API">
  <div className="space-y-4 font-mono text-xs">
    <div>
      <Label>Curl Command</Label>
      <pre className="p-2 bg-muted rounded overflow-x-auto">
{`curl -X POST ${process.env.NEXT_PUBLIC_APP_URL}/api/process \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -F "file=@data.csv" \\
  -F "prompt=${promptTemplate}"`}
      </pre>
      <CopyButton value={curlCommand} />
    </div>

    <div>
      <Button
        variant="outline"
        onClick={() => router.push('/settings/api')}
      >
        Generate API Token →
      </Button>
    </div>
  </div>
</Collapsible>
```

**File 4: Create `app/(authenticated)/settings/api/page.tsx` (NEW - 5 lines)**

Simple API token management page.

#### Files Changed
- ✅ Create `app/api/tokens/route.ts` (NEW - 30 lines)
- ✅ Create `lib/utils/token.ts` (NEW - 15 lines)
- ✅ Edit `components/wizard/StepConfigure.tsx` (+20 lines)
- ✅ Create `app/(authenticated)/settings/api/page.tsx` (NEW - 5 lines)

#### Testing

```typescript
test('generates API token', async ({ page }) => {
  await page.goto('/settings/api')
  await page.click('text=Generate Token')

  const token = await page.locator('[data-testid="api-token"]').textContent()
  expect(token).toMatch(/^bgpt_[a-f0-9]{64}$/)
})

test('curl command works', async () => {
  const token = 'bgpt_test123...'

  const response = await exec(`
    curl -X POST http://localhost:3000/api/process \\
      -H "Authorization: Bearer ${token}" \\
      -F "file=@test-data/sample.csv" \\
      -F "prompt=Test {{name}}"
  `)

  expect(response.status).toBe(202)
})
```

#### Success Criteria
- [ ] Can generate API token from settings
- [ ] Token only shown once (security)
- [ ] Curl example works
- [ ] Token validates correctly
- [ ] API endpoints accept token auth

---

## 📝 Testing Strategy

### Test Organization

```
playwright-tests/
├── parallel-processing.spec.ts    # Phase 1
├── error-retry.spec.ts            # Phase 2
├── streaming-results.spec.ts      # Phase 3
├── webhook-integration.spec.ts    # Phase 4
├── live-monitoring.spec.ts        # Phase 5
├── keyboard-shortcuts.spec.ts     # Phase 6
└── api-authentication.spec.ts     # Phase 7
```

### Run All Tests

```bash
# On VM (automated)
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56 \
  "cd /home/federicodeponte/bulk-gpt-app && npx playwright test"

# Or using helper
source ~/.claude/vm-helpers.sh
vm_ssh "cd /home/federicodeponte/bulk-gpt-app && npx playwright test"
```

### Coverage Goals
- **Unit tests:** 80%+ for utils (retry, webhook, parallel)
- **Integration tests:** All API endpoints
- **E2E tests:** Complete wizard flow with each feature

---

## 🚀 Deployment Checklist

### Before Each Phase
- [ ] Create feature branch: `git checkout -b feat/phase-N`
- [ ] Sync files to VM: `vm_sync scaile`
- [ ] Run existing tests: Ensure nothing breaks
- [ ] Implement changes
- [ ] Write tests for new features
- [ ] Run tests on VM
- [ ] Manual QA in browser

### After Each Phase
- [ ] All tests passing
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No lint errors: `npm run lint`
- [ ] Manual QA successful
- [ ] Commit changes: `git commit -m "feat: Phase N - <description>"`
- [ ] Merge to main: `git checkout main && git merge feat/phase-N`

### Final Deployment
- [ ] All 7 phases complete
- [ ] Full test suite passing
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Deploy to production

---

## 📊 Progress Tracking

### Overall Progress: 0% (0/8 phases)

| Phase | Status | Lines | Priority | Time | Completed |
|-------|--------|-------|----------|------|-----------|
| 0: Setup | 🔲 | 0 | - | 15m | - |
| 1: UX/Design | 🔲 | 115 | 🔴 CRITICAL | 3h | - |
| 2: Parallel | 🔲 | 50 | 🔴 CRITICAL | 2h | - |
| 3: Retry | 🔲 | 40 | 🔴 CRITICAL | 1.5h | - |
| 4: Streaming | 🔲 | 80 | 🟡 HIGH | 2.5h | - |
| 5: Webhooks | 🔲 | 60 | 🟡 HIGH | 1.5h | - |
| 6: Monitoring | 🔲 | 50 | 🟢 MEDIUM | 2h | - |
| 7: Keyboard | 🔲 | 30 | 🟢 MEDIUM | 1h | - |
| 8: API Tokens | 🔲 | 70 | 🟢 LOW | 2h | - |
| **TOTAL** | **0/8** | **495** | - | **15.5h** | **0%** |

### Shipping Milestones

- **Foundation (Phase 1):** 115 lines → **7/10** → Power-user UX established
- **MVP (Phases 1-3):** 205 lines → **8/10** → Beautiful + Fast + Reliable
- **Beta (Phases 1-5):** 345 lines → **9/10** → + Real-time + Webhooks
- **Full (Phases 1-8):** 495 lines → **11/10** → Complete Power Tool

**Why UX First:**
- Sets visual foundation for all other features
- Makes testing/QA more enjoyable
- Instant transformation users can SEE
- Backend features look better with good UX

---

## 🎯 Success Metrics (Final)

### Performance
- [ ] **Speed:** 1000 rows in <20s (currently 60s) - 3x improvement
- [ ] **Reliability:** 95%+ success rate with auto-retry
- [ ] **Real-time:** First result visible within 2s

### Features
- [ ] Parallel processing with configurable concurrency
- [ ] Auto-retry with exponential backoff
- [ ] Server-sent events streaming
- [ ] Webhook integration for automation
- [ ] Live monitoring dashboard
- [ ] Keyboard shortcuts
- [ ] API token authentication

### Quality
- [ ] All tests passing (unit + integration + E2E)
- [ ] TypeScript strict mode, no errors
- [ ] Zero console errors/warnings
- [ ] Responsive on mobile

### User Experience
- [ ] Power users say "this is exactly what I need"
- [ ] Faster than any competitor
- [ ] Works with n8n/Zapier out of the box
- [ ] Professional-grade reliability

---

## 📚 Resources

### Documentation
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [p-limit GitHub](https://github.com/sindresorhus/p-limit)
- [Next.js Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

### Tools
- Playwright on VM: Port 8931
- Dev server: Port 5173
- Helper scripts: `~/.claude/vm-helpers.sh`

---

## 🔄 Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| v1.0 | 2025-01-21 | Initial plan created | 📝 Draft |

---

**Last Updated:** 2025-01-21
**Next Review:** After Phase 1 completion
**Owner:** Claude Code (autonomous implementation)
