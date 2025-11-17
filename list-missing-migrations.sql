-- Quick check: List all missing migrations
-- Run this in Supabase SQL Editor to see which ones need to be run

SELECT 
  migration_file,
  table_name,
  status
FROM (
  SELECT 
    '20250115000000_create_resources.sql' as migration_file,
    'resources' as table_name,
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'resources'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
  UNION ALL
  SELECT 
    '20250115000001_create_business_contexts.sql',
    'business_contexts',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'business_contexts'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000002_create_agent_definitions.sql',
    'agent_definitions',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'agent_definitions'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000003_add_agent_id_to_batches.sql',
    'batches.agent_id',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'batches' AND column_name = 'agent_id'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000004_create_user_profiles.sql',
    'user_profiles',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'user_profiles'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000005_create_agency_packages.sql',
    'agency_packages',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'agency_packages'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000006_create_client_package_assignments.sql',
    'client_package_assignments',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'client_package_assignments'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000007_create_package_runs.sql',
    'package_runs',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'package_runs'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000008_create_usage_tracking.sql',
    'usage_tracking',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'usage_tracking'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000009_create_invoices.sql',
    'invoices',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'invoices'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000010_create_invoice_items.sql',
    'invoice_items',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'invoice_items'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL
  SELECT 
    '20250115000011_add_enabled_to_agent_definitions.sql',
    'agent_definitions.enabled',
    CASE WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'agent_definitions' AND column_name = 'enabled'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
) as checks
WHERE status = '❌ MISSING'
ORDER BY migration_file;


