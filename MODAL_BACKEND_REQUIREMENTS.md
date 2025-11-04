# Modal Backend Requirements for Real-Time Progress Tracking

**Purpose:** Enable real-time progress updates during batch processing so users see incremental progress instead of "pending → complete" jumps.

**Current State:** Modal V2 processes all rows internally and returns results in one bulk response. No progress visibility during processing.

**Desired State:** Modal updates database after each row is processed, enabling real-time progress tracking.

---

## Requirements

### 1. Database Connection

**Requirement:** Modal function needs Supabase client to write progress updates.

**Implementation:**
```python
from supabase import create_client, Client

supabase: Client = create_client(
    supabase_url=os.environ["SUPABASE_URL"],
    supabase_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)
```

**Environment Variables Needed:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for write access)

---

### 2. Incremental Progress Updates

**Requirement:** After processing each row, update `batch_results` table.

**Implementation:**
```python
async def process_row(batch_id: str, row_index: int, row_data: dict, prompt: str):
    # Process the row with AI
    result = await ai_model.process(row_data, prompt)

    # ✅ IMMEDIATELY update database
    supabase.table('batch_results').insert({
        'batch_id': batch_id,
        'row_index': row_index,
        'input_data': row_data,
        'output_data': result.output,
        'status': 'success' if result.success else 'error',
        'error_message': result.error if not result.success else None
    }).execute()

    return result
```

**Database Table:**
```sql
CREATE TABLE batch_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT REFERENCES batches(id),
  row_index INT NOT NULL,
  input_data JSONB,
  output_data TEXT,
  status TEXT,  -- 'success' | 'error' | 'pending'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

### 3. Batch Status Updates

**Requirement:** Update `batches` table with progress metadata.

**Implementation:**
```python
# At start of processing
supabase.table('batches').update({
    'status': 'processing',
    'started_at': datetime.now().isoformat()
}).eq('id', batch_id).execute()

# After each row
completed_count = get_completed_count(batch_id)
supabase.table('batches').update({
    'processed_rows': completed_count,
    'progress_percentage': (completed_count / total_rows) * 100
}).eq('id', batch_id).execute()

# At completion
supabase.table('batches').update({
    'status': 'completed',
    'completed_at': datetime.now().isoformat(),
    'processed_rows': total_rows
}).eq('id', batch_id).execute()
```

---

### 4. Concurrent Processing

**Requirement:** Process rows concurrently while maintaining order in `row_index`.

**Implementation:**
```python
import asyncio

async def process_batch(batch_id: str, rows: list, prompt: str):
    # Mark as processing
    update_batch_status(batch_id, 'processing')

    # Process rows concurrently (up to 10 at a time)
    semaphore = asyncio.Semaphore(10)

    async def process_with_semaphore(row_index, row_data):
        async with semaphore:
            return await process_row(batch_id, row_index, row_data, prompt)

    tasks = [
        process_with_semaphore(i, row)
        for i, row in enumerate(rows)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Mark as completed
    update_batch_status(batch_id, 'completed')

    return results
```

---

### 5. Webhook Callback (On Completion)

**Requirement:** Call webhook URL when batch completes (if provided).

**Implementation:**
```python
async def process_batch(batch_id: str, rows: list, prompt: str, webhook_url: str = None):
    # ... process all rows ...

    # Call webhook if provided
    if webhook_url:
        try:
            response = await httpx.post(webhook_url, json={
                'batch_id': batch_id,
                'status': 'completed',
                'total_rows': len(rows),
                'successful': success_count,
                'failed': error_count,
                'processing_time_seconds': elapsed_time
            }, timeout=10.0)

            if response.status_code != 200:
                logger.warning(f"Webhook call failed: {response.status_code}")
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            # Don't fail the batch if webhook fails
```

---

### 6. Error Handling

**Requirement:** Handle row-level errors gracefully without failing entire batch.

**Implementation:**
```python
async def process_row(batch_id: str, row_index: int, row_data: dict, prompt: str):
    try:
        result = await ai_model.process(row_data, prompt)

        supabase.table('batch_results').insert({
            'batch_id': batch_id,
            'row_index': row_index,
            'status': 'success',
            'output_data': result.output
        }).execute()

    except Exception as e:
        # ✅ Store error but continue processing other rows
        supabase.table('batch_results').insert({
            'batch_id': batch_id,
            'row_index': row_index,
            'status': 'error',
            'error_message': str(e)
        }).execute()

        logger.error(f"Row {row_index} failed: {e}")
```

---

### 7. Performance Considerations

**Database Write Frequency:**
- 1 write per row processed
- For 100 rows: 100 writes to `batch_results` + ~10 updates to `batches`
- Acceptable for Supabase (handles 1000s of writes/sec)

**Optimization:**
```python
# Batch database updates every 5 rows to reduce writes
pending_inserts = []

for i, row in enumerate(rows):
    result = await process_row_internal(row)  # Don't write yet
    pending_inserts.append(result)

    if len(pending_inserts) >= 5 or i == len(rows) - 1:
        # Bulk insert
        supabase.table('batch_results').insert(pending_inserts).execute()
        pending_inserts.clear()

        # Update progress
        update_batch_progress(batch_id, i + 1)
```

---

## API Contract

### Request Format (from Vercel)

```json
{
  "batch_id": "batch_1762245622801_xyz",
  "rows": [
    { "name": "Alice", "company": "TechCorp" },
    { "name": "Bob", "company": "StartupXYZ" }
  ],
  "prompt": "Write bio for {{name}} at {{company}}",
  "output_schema": [
    { "name": "bio", "description": "Professional biography" }
  ],
  "webhook_url": "https://bulk-gpt-app.vercel.app/api/webhook/modal-callback",
  "temperature": 0.7,
  "max_tokens": 8192
}
```

### Response Format (Immediate)

```json
{
  "success": true,
  "batch_id": "batch_1762245622801_xyz",
  "status": "processing",
  "message": "Batch processing started. Results will be written to database incrementally."
}
```

### Webhook Callback Format (On Completion)

```json
{
  "batch_id": "batch_1762245622801_xyz",
  "status": "completed",
  "total_rows": 2,
  "successful": 2,
  "failed": 0,
  "processing_time_seconds": 3.14
}
```

---

## Database Schema Requirements

**Batches Table:**
```sql
CREATE TABLE batches (
  id TEXT PRIMARY KEY,
  user_id UUID,
  status TEXT,  -- 'pending' | 'processing' | 'completed' | 'failed'
  total_rows INT,
  processed_rows INT DEFAULT 0,
  progress_percentage NUMERIC DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

**Batch Results Table:**
```sql
CREATE TABLE batch_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT REFERENCES batches(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  input_data JSONB,
  output_data TEXT,
  status TEXT,  -- 'success' | 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, row_index)
)
```

---

## Testing Requirements

### Unit Tests
```python
async def test_incremental_updates():
    batch_id = "test_batch_123"
    rows = [{"name": "Test"}]

    await process_batch(batch_id, rows, "Test prompt")

    # Verify batch_results has 1 row
    results = supabase.table('batch_results').select('*').eq('batch_id', batch_id).execute()
    assert len(results.data) == 1

    # Verify batches table updated
    batch = supabase.table('batches').select('*').eq('id', batch_id).single().execute()
    assert batch.data['status'] == 'completed'
    assert batch.data['processed_rows'] == 1
```

### Integration Tests
```python
async def test_concurrent_processing():
    batch_id = "test_batch_concurrent"
    rows = [{"name": f"Test{i}"} for i in range(10)]

    start = time.time()
    await process_batch(batch_id, rows, "Test prompt")
    elapsed = time.time() - start

    # Should process concurrently (< 5s for 10 rows)
    assert elapsed < 5.0

    # All rows should have results
    results = supabase.table('batch_results').select('*').eq('batch_id', batch_id).execute()
    assert len(results.data) == 10
```

---

## Deployment Requirements

### Environment Variables
```bash
SUPABASE_URL=https://ayjpnfzbxhcwwxvobssn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Service role key
```

### Dependencies
```python
# requirements.txt
supabase-py>=2.0.0
httpx>=0.24.0  # For webhook callbacks
```

### Modal Function
```python
import modal

stub = modal.Stub("g-mcp-tools-v2")

@stub.function(
    secrets=[
        modal.Secret.from_name("supabase-credentials")
    ],
    timeout=3600,  # 1 hour max
    container_idle_timeout=300
)
async def process_batch_with_progress(
    batch_id: str,
    rows: list,
    prompt: str,
    webhook_url: str = None
):
    # Implementation here
    pass
```

---

## Success Criteria

✅ **Database updates after each row** - `batch_results` table grows incrementally
✅ **Progress tracking works** - `batches.processed_rows` updates during processing
✅ **Frontend sees real-time updates** - SSE endpoint detects new rows every 2s
✅ **Webhook called on completion** - Vercel receives callback when done
✅ **Error handling** - Individual row failures don't break batch
✅ **Performance acceptable** - Processes 100 rows in < 5 minutes

---

## Timeline Estimate

- **Setup Supabase client:** 15 min
- **Implement incremental updates:** 30 min
- **Add concurrent processing:** 30 min
- **Webhook callback:** 15 min
- **Error handling:** 20 min
- **Testing:** 30 min
- **Deployment:** 10 min

**Total:** ~2.5 hours

---

## Notes

- This is **separate work** from the webhook solution on Vercel side
- Vercel webhook solution works WITHOUT these changes (just no real-time progress)
- These changes enable **true real-time progress** (row-by-row updates)
- Optional but highly recommended for better UX

---

**Status:** 📋 **Requirements Documented - Ready for Implementation**

Implement these changes in Modal backend to enable real-time progress tracking.
