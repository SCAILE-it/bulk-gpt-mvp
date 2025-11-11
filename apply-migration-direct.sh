#!/usr/bin/env bash

# Apply migration using Supabase direct database connection

set -e

# Supabase connection details
PROJECT_REF="ayjpnfzbxhcwwxvobssn"

echo "🔍 Connecting to Supabase database..."
echo "📍 Project: ${PROJECT_REF}"
echo ""

# Supabase direct connection (requires database password from dashboard)
echo "⚠️  This requires the DATABASE PASSWORD from Supabase Dashboard"
echo "📖 Get it from: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
echo ""
echo "Please enter the database password:"
read -s DB_PASSWORD

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ No password provided"
  exit 1
fi

# Direct database URL
DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

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
