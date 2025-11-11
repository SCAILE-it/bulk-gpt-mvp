#!/usr/bin/env node

/**
 * Apply migration to Supabase database
 * Usage: node scripts/apply-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20251106000000_increase_beta_limits.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('📦 Applying migration: increase_beta_limits');
console.log('🎯 Target: Beta plan limits 5→50 batches, 5k→50k rows\n');

// Execute SQL using Supabase RPC
async function applyMigration() {
  try {
    // Use the Supabase REST API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // If RPC method doesn't exist, we need to execute it differently
      // Let's try using pg query via Node
      console.log('⚠️  Direct SQL execution via API not available');
      console.log('📋 Please run this SQL manually in Supabase SQL Editor:\n');
      console.log(sql);
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Migration applied successfully!');
    console.log('📊 New limits:');
    console.log('   • Beta plan: 50 batches/day');
    console.log('   • Beta plan: 50,000 rows/day');
  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n');
    console.log(sql);
    process.exit(1);
  }
}

applyMigration();
