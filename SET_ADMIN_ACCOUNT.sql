-- Set up one admin account (admin type)
-- This makes the account able to create packages and manage clients
-- Copy this ENTIRE file content into Supabase SQL Editor and run it

-- Option 1: Set the first user (by creation date) as admin
-- Uncomment the lines below if you want to use this approach:
/*
INSERT INTO user_profiles (user_id, user_type)
SELECT id, 'admin' 
FROM auth.users 
ORDER BY created_at ASC 
LIMIT 1
ON CONFLICT (user_id) DO UPDATE SET user_type = 'admin';
*/

-- Option 2: Set a specific email as admin (RECOMMENDED)
-- Replace 'admin@example.com' with your actual admin email
INSERT INTO user_profiles (user_id, user_type)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'admin@example.com'  -- CHANGE THIS TO YOUR EMAIL
ON CONFLICT (user_id) DO UPDATE SET user_type = 'admin';

-- Verify the admin account was set
SELECT 
  u.email,
  up.user_type,
  up.created_at as profile_created_at
FROM auth.users u
LEFT JOIN user_profiles up ON up.user_id = u.id
WHERE up.user_type = 'admin';

