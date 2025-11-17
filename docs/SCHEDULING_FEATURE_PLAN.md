# Scheduling Feature Implementation Plan

## Overview
Add scheduled runs capability for all agents using Supabase pg_cron extension. Users can schedule "test" or "run" actions with cron expressions.

## Architecture

### 1. Database Schema

#### New Table: `scheduled_runs`
```sql
CREATE TABLE scheduled_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Agent/Batch Configuration
  agent_type TEXT NOT NULL DEFAULT 'bulk_agent', -- 'bulk_agent', 'lead_crawling', etc.
  name TEXT NOT NULL, -- User-friendly name for the schedule
  description TEXT,
  
  -- Schedule Configuration
  cron_expression TEXT NOT NULL, -- e.g., "0 9 * * *" (daily at 9 AM)
  timezone TEXT DEFAULT 'UTC', -- User's timezone preference
  action TEXT NOT NULL CHECK (action IN ('test', 'run')), -- 'test' or 'run'
  
  -- Configuration Snapshot (stored as JSONB)
  -- This stores the complete configuration at schedule creation time
  config JSONB NOT NULL, -- Contains: prompt, output_fields, selected_tools, csv_data (or reference), etc.
  
  -- CSV/Data Source
  csv_data JSONB, -- Store CSV data directly OR
  csv_file_path TEXT, -- Reference to context file OR
  csv_url TEXT, -- Google Sheets URL (if applicable)
  
  -- Status & Execution Tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Execution History
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'running')),
  last_run_batch_id UUID REFERENCES batches(id),
  next_run_at TIMESTAMPTZ NOT NULL, -- Calculated from cron expression
  run_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_cron CHECK (cron_expression ~ '^[0-9\*\-\,\/]+ [0-9\*\-\,\/]+ [0-9\*\-\,\/]+ [0-9\*\-\,\/]+ [0-9\*\-\,\/]+$')
);

-- Indexes
CREATE INDEX idx_scheduled_runs_user_id ON scheduled_runs(user_id);
CREATE INDEX idx_scheduled_runs_status ON scheduled_runs(status) WHERE status = 'active';
CREATE INDEX idx_scheduled_runs_next_run ON scheduled_runs(next_run_at) WHERE is_enabled = true AND status = 'active';
CREATE INDEX idx_scheduled_runs_agent_type ON scheduled_runs(agent_type);

-- RLS Policies
ALTER TABLE scheduled_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules"
  ON scheduled_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules"
  ON scheduled_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON scheduled_runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON scheduled_runs FOR DELETE
  USING (auth.uid() = user_id);

-- Function to calculate next_run_at from cron expression
CREATE OR REPLACE FUNCTION calculate_next_run(cron_expr TEXT, timezone_name TEXT DEFAULT 'UTC')
RETURNS TIMESTAMPTZ AS $$
-- Implementation using pg_cron or manual calculation
-- For now, we'll use a helper function
$$ LANGUAGE plpgsql;
```

#### New Table: `scheduled_run_executions` (Optional - for detailed history)
```sql
CREATE TABLE scheduled_run_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_run_id UUID NOT NULL REFERENCES scheduled_runs(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_executions_scheduled_run ON scheduled_run_executions(scheduled_run_id);
CREATE INDEX idx_executions_batch ON scheduled_run_executions(batch_id);
```

### 2. Supabase pg_cron Setup

#### Enable pg_cron Extension
```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
```

#### Cron Job Function
```sql
-- Function that runs every minute to check for scheduled runs
CREATE OR REPLACE FUNCTION execute_scheduled_runs()
RETURNS void AS $$
DECLARE
  scheduled_run RECORD;
  batch_id UUID;
BEGIN
  -- Find all active schedules that need to run now
  FOR scheduled_run IN
    SELECT *
    FROM scheduled_runs
    WHERE status = 'active'
      AND is_enabled = true
      AND next_run_at <= NOW()
      AND next_run_at >= NOW() - INTERVAL '1 minute' -- Prevent duplicate runs
  LOOP
    -- Call Next.js API endpoint to execute the batch
    -- This will be done via HTTP request to our API
    PERFORM net.http_post(
      url := current_setting('app.scheduled_runs_api_url', true) || '/api/schedules/' || scheduled_run.id || '/execute',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object(
        'scheduled_run_id', scheduled_run.id
      )
    );
    
    -- Update next_run_at (calculate next occurrence)
    UPDATE scheduled_runs
    SET 
      next_run_at = calculate_next_run(cron_expression, timezone),
      last_run_at = NOW(),
      run_count = run_count + 1,
      updated_at = NOW()
    WHERE id = scheduled_run.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'execute-scheduled-runs',
  '* * * * *', -- Every minute
  $$SELECT execute_scheduled_runs()$$
);
```

**Alternative Approach (Simpler):**
Instead of using pg_cron's HTTP calls, we can:
1. Use pg_cron to call a PostgreSQL function
2. That function calls a Supabase Edge Function
3. Edge Function calls our Next.js API

Or even simpler:
1. Use Vercel Cron Jobs (if on Vercel) to call our API every minute
2. API checks for scheduled runs and executes them

### 3. API Routes

#### `/app/api/schedules/route.ts`
- `GET` - List all schedules for current user
- `POST` - Create a new schedule

#### `/app/api/schedules/[id]/route.ts`
- `GET` - Get schedule details
- `PUT` - Update schedule
- `DELETE` - Delete schedule (soft delete)

#### `/app/api/schedules/[id]/execute/route.ts`
- `POST` - Execute a schedule immediately (manual trigger)
- Called by cron job to execute scheduled runs

#### `/app/api/schedules/[id]/toggle/route.ts`
- `POST` - Enable/disable a schedule

#### `/app/api/schedules/[id]/next-runs/route.ts`
- `GET` - Get next N run times for preview

### 4. UI Components

#### Schedule Button (in BulkProcessor)
- Add "Schedule" button next to "Test" and "Bulk Agent" buttons
- Opens schedule modal

#### Schedule Modal (`components/schedules/ScheduleModal.tsx`)
- Form fields:
  - Name (required)
  - Description (optional)
  - Action: Test / Run (radio)
  - Schedule: Cron expression input with helper
  - Timezone selector
  - Preview: Shows next 5 run times
- Validates cron expression
- Saves configuration snapshot

#### Schedule List (`components/schedules/ScheduleList.tsx`)
- Table/list view of all schedules
- Shows: Name, Agent Type, Schedule, Next Run, Status, Actions
- Actions: Edit, Delete, Enable/Disable, Run Now

#### Cron Expression Helper (`components/schedules/CronExpressionBuilder.tsx`)
- Visual builder for common schedules:
  - Daily at specific time
  - Weekly on specific day
  - Monthly on specific day
  - Custom cron expression
- Shows human-readable description
- Validates expression

#### Schedule Page (`app/(authenticated)/schedules/page.tsx`)
- Full page for managing schedules
- List view with filters
- Create new schedule button

### 5. Configuration Storage

The `config` JSONB field stores:
```typescript
{
  prompt: string
  outputFields: Array<{name: string, type: string}>
  selectedTools: string[]
  selectedInputColumns?: string[]
  model?: string
  temperature?: number
  maxTokens?: number
  // Any other agent-specific config
}
```

For CSV data, we have options:
1. **Store CSV data directly** in `csv_data` JSONB (good for small CSVs)
2. **Reference context file** via `csv_file_path` (better for large files)
3. **Store Google Sheets URL** in `csv_url` (for Google Sheets integration)

### 6. Execution Flow

1. **Cron Trigger** (every minute)
   - pg_cron calls `execute_scheduled_runs()` function
   - Function finds schedules where `next_run_at <= NOW()`

2. **API Call**
   - Function calls `/api/schedules/[id]/execute` endpoint
   - Endpoint authenticates using service role key

3. **Execution**
   - API endpoint:
     - Loads schedule configuration
     - Loads CSV data (from JSONB, file, or URL)
     - Creates a batch (same as manual run)
     - Processes batch using existing batch processing logic
     - Updates `scheduled_runs.last_run_at`, `last_run_status`, `last_run_batch_id`

4. **Result Tracking**
   - Batch ID stored in `scheduled_runs.last_run_batch_id`
   - User can view results in Dashboard like any other batch
   - Optional: Store execution details in `scheduled_run_executions` table

### 7. Implementation Steps

#### Phase 1: Database & API Foundation
1. ✅ Create database migration for `scheduled_runs` table
2. ✅ Create RLS policies
3. ✅ Create API routes for CRUD operations
4. ✅ Create function to calculate next_run_at from cron

#### Phase 2: Basic Scheduling UI
1. ✅ Add "Schedule" button to BulkProcessor
2. ✅ Create ScheduleModal component
3. ✅ Create basic cron expression input
4. ✅ Implement schedule creation API

#### Phase 3: Cron Execution
1. ✅ Set up pg_cron extension
2. ✅ Create execute_scheduled_runs() function
3. ✅ Create execute API endpoint
4. ✅ Test execution flow

#### Phase 4: Schedule Management UI
1. ✅ Create ScheduleList component
2. ✅ Create schedules page
3. ✅ Add edit/delete/enable/disable actions
4. ✅ Add "Run Now" functionality

#### Phase 5: Enhanced Features
1. ✅ Improve cron expression builder (visual helper)
2. ✅ Add timezone support
3. ✅ Add execution history view
4. ✅ Add notifications for scheduled runs
5. ✅ Add schedule templates (daily, weekly, etc.)

### 8. Edge Cases & Considerations

#### CSV Data Handling
- **Small CSVs (< 1MB)**: Store directly in JSONB
- **Large CSVs**: Store reference to context file, fetch on execution
- **Google Sheets**: Store URL, fetch on execution
- **CSV Changes**: Consider if CSV should be snapshot or live reference

#### Configuration Changes
- **Prompt Changes**: Should scheduled runs use old or new prompt?
  - **Solution**: Snapshot config at schedule creation (current approach)
- **Output Fields Changes**: Same as above
- **CSV Updates**: If using file reference, use latest version

#### Error Handling
- **Failed Execution**: Update `last_run_status` to 'failed', store error message
- **Retry Logic**: Option to retry failed schedules
- **Rate Limiting**: Respect batch limits per user

#### Timezone Handling
- Store user's timezone preference
- Convert cron expression to UTC for storage
- Display times in user's timezone in UI

#### Cron Expression Validation
- Validate format on frontend
- Validate on backend before saving
- Use library like `cron-parser` for validation and next run calculation

### 9. Libraries & Dependencies

```json
{
  "dependencies": {
    "cron-parser": "^4.9.0", // For cron expression parsing and next run calculation
    "date-fns-tz": "^2.0.0" // For timezone handling
  }
}
```

### 10. Testing Strategy

1. **Unit Tests**
   - Cron expression validation
   - Next run calculation
   - Configuration serialization/deserialization

2. **Integration Tests**
   - Schedule creation flow
   - Schedule execution flow
   - Error handling

3. **E2E Tests**
   - Create schedule from Bulk Agent
   - Verify schedule appears in list
   - Verify execution happens at correct time
   - Verify results appear in Dashboard

### 11. Security Considerations

1. **RLS Policies**: Ensure users can only access their own schedules
2. **API Authentication**: Use service role key for cron-triggered executions
3. **Rate Limiting**: Prevent abuse of schedule creation
4. **Input Validation**: Validate cron expressions and config data
5. **CSV Data Access**: Ensure users can't access other users' CSV data

### 12. Migration Path

1. **Existing Users**: No migration needed, feature is additive
2. **Existing Batches**: Can be converted to schedules (future feature)
3. **Backward Compatibility**: All existing functionality remains unchanged

## Next Steps

1. Review and approve this plan
2. Start with Phase 1 (Database & API Foundation)
3. Iterate based on feedback

