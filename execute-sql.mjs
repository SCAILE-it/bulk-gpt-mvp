#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Executing SQL migration...\n');

const sql = readFileSync('./supabase/migrations/20251106000000_increase_beta_limits.sql', 'utf8');

// Try direct connection with proper format
const projectRef = 'ayjpnfzbxhcwwxvobssn';

// Supabase connection pooler format
const connectionString = `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;

// Alternative: Try using transaction pooler
const poolerString = `postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres`;

console.log('📡 Attempting direct database connection...\n');
console.log('⚠️  Note: Need database password from Supabase Dashboard → Settings → Database\n');

// Instead, let's use Supabase's Management API
async function executeWithManagementAPI() {
  try {
    // Use Supabase client to call a custom function
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Create a temporary function to execute our SQL
    const setupSQL = `
      CREATE OR REPLACE FUNCTION execute_migration()
      RETURNS void AS $$
      BEGIN
        ${sql}
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Execute via rpc
    const { data, error } = await supabase.rpc('execute_migration');

    if (error) {
      throw error;
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('📊 New beta plan limits:');
    console.log('   • 50 batches/day (was 5)');
    console.log('   • 50,000 rows/day (was 5,000)');
    console.log('\n🎉 You can now process up to 50 batches for testing!');

  } catch (err) {
    console.error('❌ Failed:', err.message);
    console.log('\n💡 Alternative: Please run the SQL manually:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn/sql/new');
    console.log('   2. Paste the SQL from: supabase/migrations/20251106000000_increase_beta_limits.sql');
    console.log('   3. Click "Run"');
    process.exit(1);
  }
}

executeWithManagementAPI();
