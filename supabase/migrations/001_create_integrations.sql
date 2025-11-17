-- Enable pgsodium extension for encryption
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Enable pgcrypto extension for key generation (more accessible than pgsodium.randombytes_buf)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create integrations table to store API keys and connection status
-- Uses pgsodium for encryption (similar to zola-aisdkv5/data-integrations-complete)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hubspot', 'instantly', 'phantombuster')),
  api_key_encrypted BYTEA NOT NULL, -- Encrypted using pgsodium
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own integrations
CREATE POLICY "Users can view own integrations"
  ON integrations FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own integrations
CREATE POLICY "Users can insert own integrations"
  ON integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own integrations
CREATE POLICY "Users can update own integrations"
  ON integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own integrations
CREATE POLICY "Users can delete own integrations"
  ON integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create encryption key (if not exists)
-- Uses pgcrypto.gen_random_bytes() for key generation (more accessible than pgsodium.randombytes_buf)
DO $$
DECLARE
  key_id UUID;
BEGIN
  SELECT id INTO key_id FROM pgsodium.key WHERE name = 'integrations_api_key_encryption';
  
  IF key_id IS NULL THEN
    PERFORM pgsodium.create_key(
      name := 'integrations_api_key_encryption',
      raw_key := gen_random_bytes(32) -- 256-bit key
    );
  END IF;
END $$;

-- Create function to encrypt API key
CREATE OR REPLACE FUNCTION encrypt_api_key(api_key TEXT)
RETURNS BYTEA AS $$
DECLARE
  key_id UUID;
BEGIN
  -- Get the encryption key
  SELECT id INTO key_id FROM pgsodium.key WHERE name = 'integrations_api_key_encryption';
  
  IF key_id IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  -- Encrypt the API key using pgsodium
  RETURN pgsodium.crypto_secretbox_encrypt(
    api_key::BYTEA,
    key_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrypt API key
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key BYTEA)
RETURNS TEXT AS $$
DECLARE
  key_id UUID;
BEGIN
  -- Get the encryption key
  SELECT id INTO key_id FROM pgsodium.key WHERE name = 'integrations_api_key_encryption';
  
  IF key_id IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  -- Decrypt the API key using pgsodium
  RETURN convert_from(
    pgsodium.crypto_secretbox_decrypt(
      encrypted_key,
      key_id
    ),
    'UTF8'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (they can only decrypt their own keys via RLS)
GRANT EXECUTE ON FUNCTION encrypt_api_key(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_api_key(BYTEA) TO authenticated;

