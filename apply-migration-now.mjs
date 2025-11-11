#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
dotenv.config({ path: join(__dirname, '.env.local') });

const SUPABASE_URL = 'https://ayjpnfzbxhcwwxvobssn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📦 Applying migration to increase beta limits...\n');

// Read migration SQL
const sql = readFileSync(join(__dirname, 'supabase/migrations/20251106000000_increase_beta_limits.sql'), 'utf8');

// Create admin client
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Execute via RPC - create a temp function to execute SQL
async function executeSql() {
  try {
    // Since Supabase doesn't expose raw SQL execution via REST API,
    // we'll use the pg connection directly via a minimal postgres client
    console.log('🔧 Executing SQL migration...\n');

    // Extract just the CREATE OR REPLACE FUNCTION part
    const functionSQL = sql;

    // Use Supabase's query method if available
    const { data, error } = await supabase.rpc('exec', { sql: functionSQL }).catch(async (err) => {
      // If exec RPC doesn't exist, try direct connection
      console.log('⚠️  exec RPC not available, trying alternative...\n');

      // Try using supabase-js's internal query method (not recommended but works)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: functionSQL })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return { data: await response.json(), error: null };
    });

    if (error) {
      console.error('❌ Error:', error);
      console.log('\n📋 Please run this SQL manually in Supabase Dashboard → SQL Editor:\n');
      console.log('━'.repeat(80));
      console.log(sql);
      console.log('━'.repeat(80));
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('📊 New beta plan limits:');
    console.log('   • 50 batches/day (was 5)');
    console.log('   • 50,000 rows/day (was 5,000)');
    console.log('\n🎉 You can now process up to 50 batches for testing!');

  } catch (err) {
    console.error('❌ Failed:', err.message);
    console.log('\n📋 Please run this SQL manually in Supabase Dashboard → SQL Editor:\n');
    console.log('━'.repeat(80));
    console.log(sql);
    console.log('━'.repeat(80));
    console.log('\nSteps:');
    console.log('1. Go to https://supabase.com/dashboard/project/ayjpnfzbxhcwwxvobssn/sql/new');
    console.log('2. Paste the SQL above');
    console.log('3. Click "Run"');
    process.exit(1);
  }
}

executeSql();
