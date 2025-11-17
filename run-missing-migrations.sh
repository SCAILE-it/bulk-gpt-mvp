#!/bin/bash
# Run all missing migrations in order
# Usage: ./run-missing-migrations.sh

set -e

echo "🚀 Running Missing Migrations"
echo "================================"
echo ""

MIGRATIONS_DIR="supabase/migrations"

# List of all migrations in order
MIGRATIONS=(
  "20250115000000_create_resources.sql"
  "20250115000001_create_business_contexts.sql"
  "20250115000002_create_agent_definitions.sql"
  "20250115000003_add_agent_id_to_batches.sql"
  "20250115000004_create_user_profiles.sql"
  "20250115000005_create_agency_packages.sql"
  "20250115000006_create_client_package_assignments.sql"
  "20250115000007_create_package_runs.sql"
  "20250115000008_create_usage_tracking.sql"
  "20250115000009_create_invoices.sql"
  "20250115000010_create_invoice_items.sql"
  "20250115000011_add_enabled_to_agent_definitions.sql"
)

echo "📋 Available migrations:"
for mig in "${MIGRATIONS[@]}"; do
  if [ -f "$MIGRATIONS_DIR/$mig" ]; then
    echo "  ✅ $mig"
  else
    echo "  ❌ $mig (file not found)"
  fi
done

echo ""
echo "💡 To run migrations:"
echo ""
echo "Option 1: Supabase Dashboard (Recommended)"
echo "  1. Go to Supabase Dashboard → SQL Editor"
echo "  2. Copy/paste each migration file content"
echo "  3. Run them in order (starting with missing ones)"
echo ""
echo "Option 2: Supabase CLI"
echo "  supabase db push"
echo ""
echo "Option 3: Manual - Run these files in order:"
for mig in "${MIGRATIONS[@]}"; do
  if [ -f "$MIGRATIONS_DIR/$mig" ]; then
    echo "  - $MIGRATIONS_DIR/$mig"
  fi
done

echo ""
echo "⚠️  Based on your check, these are MISSING:"
echo "  - 20250115000000_create_resources.sql"
echo "  - 20250115000001_create_business_contexts.sql"
echo "  - (and 3 more - run list-missing-migrations.sql to see all)"
echo ""
echo "✅ Run migrations in order starting from the first missing one!"


