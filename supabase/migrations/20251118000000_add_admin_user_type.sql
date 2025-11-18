-- Add 'admin' to user_type constraint
-- This allows admin users to manage clients and packages

-- Drop the old constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_user_type_check;

-- Add new constraint that includes 'admin'
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_user_type_check
CHECK (user_type IN ('self_service', 'client', 'agency', 'admin'));

-- Update comments
COMMENT ON COLUMN user_profiles.user_type IS 'User type: self_service (default), client (managed by agency), agency (deprecated, use admin), admin (can manage clients and packages)';
