-- ============================================
-- MIGRATION 2: Add Analytics Resource Type
-- ============================================
-- Run this in Supabase SQL Editor
-- This allows analytics agents to create analytics resources

-- Step 1: Drop existing constraint
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_check;

-- Step 2: Add updated constraint with 'analytics' included
ALTER TABLE resources ADD CONSTRAINT resources_type_check 
  CHECK (type IN ('lead', 'keyword', 'content', 'campaign', 'analytics'));

-- Step 3: Add index for analytics resources (for performance)
CREATE INDEX IF NOT EXISTS idx_resources_analytics ON resources(user_id, type) 
  WHERE type = 'analytics';

-- Step 4: Verify the constraint was updated
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'resources_type_check';

-- Expected result: Should show constraint with 'analytics' in the CHECK clause

