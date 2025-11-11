#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Executing SQL migration with service role key...\n');

const sql = readFileSync('./supabase/migrations/20251106000000_increase_beta_limits.sql', 'utf8');

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Execute the SQL by calling it through Postgres
async function runMigration() {
  try {
    // Use the REST API to execute raw SQL via the service role
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Try alternative: use pg client directly
      const { Client } = await import('pg');

      // Get connection details from Supabase URL
      const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)[1];
      const connectionString = `postgresql://postgres.${projectRef}:${SERVICE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

      console.log('📡 Connecting to database...');
      const client = new Client({ connectionString });
      await client.connect();

      console.log('⚙️  Executing migration SQL...');
      await client.query(sql);

      await client.end();

      console.log('✅ Migration applied successfully!\n');
      console.log('📊 New beta plan limits:');
      console.log('   • 50 batches/day (was 5)');
      console.log('   • 50,000 rows/day (was 5,000)');
      console.log('\n🎉 You can now process up to 50 batches for testing!');
      return;
    }

    console.log('✅ Migration applied successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();
