#!/usr/bin/env bash

# Apply migration to production database using psql

set -e

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Extract database URL components
PROJECT_REF="ayjpnfzbxhcwwxvobssn"
DB_PASSWORD="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local"
  exit 1
fi

# Construct connection string
# For Supabase: postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

echo "🔍 Connecting to Supabase database..."
echo "📍 Project: ${PROJECT_REF}"
echo ""
echo "🚀 Applying migration: 20251029094229_api_keys_and_usage.sql"
echo ""

# Apply the migration
psql "$DB_URL" -f supabase/migrations/20251029094229_api_keys_and_usage.sql

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "🧪 Testing check_usage_limits function..."

# Test the function
psql "$DB_URL" -c "SELECT * FROM check_usage_limits('16212508-50d4-43be-bff2-51e4a26e07b4');"

echo ""
echo "🎉 All done!"
