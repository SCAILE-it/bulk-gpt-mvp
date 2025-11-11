#!/usr/bin/env node

import pg from 'pg';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const projectRef = 'ayjpnfzbxhcwwxvobssn';
const cliUserPassword = 'S3t_UpA$tr0ng!Pa55_2025';

// Use cli_user with pooler connection
const connectionString = `postgresql://cli_user:${encodeURIComponent(cliUserPassword)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres?options=project%3D${projectRef}`;

console.log('🔧 Connecting to Supabase database...\n');

const client = new pg.Client({ connectionString });

async function applyMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const sql = readFileSync('./supabase/migrations/20251106000000_increase_beta_limits.sql', 'utf8');

    console.log('⚙️  Executing migration SQL...\n');
    await client.query(sql);

    console.log('✅ Migration applied successfully!\n');
    console.log('📊 New beta plan limits:');
    console.log('   • 50 batches/day (was 5)');
    console.log('   • 50,000 rows/day (was 5,000)');
    console.log('\n🎉 You can now process up to 50 batches for testing!');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    await client.end();
    process.exit(1);
  }
}

applyMigration();
