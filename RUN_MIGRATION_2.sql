-- Migration 2: Add 'analytics' as a valid resource type
-- Run this in Supabase SQL Editor

-- Add 'analytics' as a valid resource type
-- Allows analytics agents to create analytics resources

ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_check;
ALTER TABLE resources ADD CONSTRAINT resources_type_check 
  CHECK (type IN ('lead', 'keyword', 'content', 'campaign', 'analytics'));

-- Add index for analytics resources
CREATE INDEX IF NOT EXISTS idx_resources_analytics ON resources(user_id, type) 
  WHERE type = 'analytics';

-- Verify the constraint was updated
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'resources_type_check';
