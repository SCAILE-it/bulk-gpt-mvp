#!/bin/bash

# Load environment
source .env.local

# Execute SQL using Supabase CLI
supabase db execute \
  --project-ref ayjpnfzbxhcwwxvobssn \
  --db-password "$SUPABASE_SERVICE_ROLE_KEY" \
  --file supabase/migrations/20251106000000_increase_beta_limits.sql

echo ""
echo "✅ Migration executed!"
echo "📊 New beta limits: 50 batches/day, 50k rows/day"
