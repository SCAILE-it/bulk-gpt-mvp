-- Verify Resource Linking Migration
-- Run this in Supabase SQL Editor to confirm the migration was applied

-- 1. Check if related_resource_ids column exists
SELECT 
  column_name,
  data_type,
  column_default,
  CASE 
    WHEN column_name = 'related_resource_ids' THEN '✅ Migration Applied'
    ELSE ''
  END as status
FROM information_schema.columns
WHERE table_name = 'resources'
  AND column_name = 'related_resource_ids';

-- 2. Check if index exists
SELECT 
  indexname,
  indexdef,
  CASE 
    WHEN indexname = 'idx_resources_related_ids' THEN '✅ Index Created'
    ELSE ''
  END as status
FROM pg_indexes
WHERE tablename = 'resources'
  AND indexname = 'idx_resources_related_ids';

-- 3. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  CASE 
    WHEN trigger_name = 'validate_related_resource_ids_trigger' THEN '✅ Trigger Created'
    ELSE ''
  END as status
FROM information_schema.triggers
WHERE event_object_table = 'resources'
  AND trigger_name = 'validate_related_resource_ids_trigger';

-- 4. Summary
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'resources' 
      AND column_name = 'related_resource_ids'
    ) THEN '✅ Resource Linking Migration COMPLETE'
    ELSE '❌ Migration NOT Applied'
  END as migration_status;

