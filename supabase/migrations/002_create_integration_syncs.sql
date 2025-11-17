-- Create integration_syncs table to track sync operations
CREATE TABLE IF NOT EXISTS integration_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hubspot', 'instantly', 'phantombuster')),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('read', 'write', 'full')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  records_synced INTEGER DEFAULT 0,
  records_total INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_syncs_user_id ON integration_syncs(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_syncs_integration_id ON integration_syncs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_syncs_status ON integration_syncs(status);
CREATE INDEX IF NOT EXISTS idx_integration_syncs_created_at ON integration_syncs(created_at DESC);

-- Enable RLS
ALTER TABLE integration_syncs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own syncs"
  ON integration_syncs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own syncs"
  ON integration_syncs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own syncs"
  ON integration_syncs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

