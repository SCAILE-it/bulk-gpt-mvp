-- Check which GTM Engine migrations have been applied
-- Run this in Supabase SQL Editor

-- Check each table created by migrations
SELECT 
  'resources' as table_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'resources'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
  '20250115000000_create_resources.sql' as migration_file
UNION ALL
SELECT 
  'business_contexts',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'business_contexts'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000001_create_business_contexts.sql'
UNION ALL
SELECT 
  'agent_definitions',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'agent_definitions'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000002_create_agent_definitions.sql'
UNION ALL
SELECT 
  'batches.agent_id column',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'batches' AND column_name = 'agent_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000003_add_agent_id_to_batches.sql'
UNION ALL
SELECT 
  'user_profiles',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'user_profiles'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000004_create_user_profiles.sql'
UNION ALL
SELECT 
  'agency_packages',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'agency_packages'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000005_create_agency_packages.sql'
UNION ALL
SELECT 
  'client_package_assignments',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'client_package_assignments'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000006_create_client_package_assignments.sql'
UNION ALL
SELECT 
  'package_runs',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'package_runs'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000007_create_package_runs.sql'
UNION ALL
SELECT 
  'usage_tracking',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'usage_tracking'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000008_create_usage_tracking.sql'
UNION ALL
SELECT 
  'invoices',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'invoices'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000009_create_invoices.sql'
UNION ALL
SELECT 
  'invoice_items',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'invoice_items'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000010_create_invoice_items.sql'
UNION ALL
SELECT 
  'agent_definitions.enabled column',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'agent_definitions' AND column_name = 'enabled'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END,
  '20250115000011_add_enabled_to_agent_definitions.sql'
ORDER BY migration_file;

-- Summary
SELECT 
  COUNT(*) FILTER (WHERE status = '✅ EXISTS') as applied_count,
  COUNT(*) FILTER (WHERE status = '❌ MISSING') as missing_count,
  COUNT(*) as total_migrations,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = '❌ MISSING') = 0 THEN '✅ ALL MIGRATIONS APPLIED'
    ELSE '⚠️ SOME MIGRATIONS MISSING - See list above'
  END as overall_status
FROM (
  SELECT 
    CASE WHEN EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'resources'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'business_contexts'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'agent_definitions'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'batches' AND column_name = 'agent_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'user_profiles'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'agency_packages'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'client_package_assignments'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'package_runs'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'usage_tracking'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'invoices'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'invoice_items'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
  UNION ALL SELECT CASE WHEN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'agent_definitions' AND column_name = 'enabled'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
) as checks;


