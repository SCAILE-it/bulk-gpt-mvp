-- Create integration_data table to store synced data from integrations
-- This allows us to cache data and use it for bulk processing
CREATE TABLE IF NOT EXISTS integration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hubspot', 'instantly', 'phantombuster')),
  external_id TEXT NOT NULL, -- ID from the external system (e.g., HubSpot contact ID)
  data_type TEXT NOT NULL, -- e.g., 'contact', 'company', 'deal', 'campaign'
  data JSONB NOT NULL, -- Full record data from integration
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, external_id, data_type)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_integration_data_user_id ON integration_data(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_integration_id ON integration_data(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_provider ON integration_data(provider);
CREATE INDEX IF NOT EXISTS idx_integration_data_type ON integration_data(data_type);
CREATE INDEX IF NOT EXISTS idx_integration_data_external_id ON integration_data(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_synced_at ON integration_data(synced_at DESC);

-- Enable RLS
ALTER TABLE integration_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own integration data"
  ON integration_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integration data"
  ON integration_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integration data"
  ON integration_data FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integration data"
  ON integration_data FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_integration_data_updated_at
  BEFORE UPDATE ON integration_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

