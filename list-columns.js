// List actual columns in batch_results
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ayjpnfzbxhcwwxvobssn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5anBuZnpieGhjd3d4dm9ic3NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY0MjUxNSwiZXhwIjoyMDc2MjE4NTE1fQ.1BFcQeilNU0r0PVbuoOkl8TOy7XVeb6K-T5X5_fpA-s'

const { Client } = require('pg')

async function listColumns() {
  console.log('Connecting to database directly...\n')
  
  // Parse connection string
  const dbUrl = supabaseUrl.replace('https://', '')
  const projectRef = 'ayjpnfzbxhcwwxvobssn'
  
  const client = new Client({
    host: `aws-0-eu-central-1.pooler.supabase.com`,
    port: 6543,
    database: 'postgres',
    user: `postgres.${projectRef}`,
    password: supabaseServiceKey.split('.')[2], // Extract password from JWT
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to database\n')
    
    // Get columns
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'batch_results'
      ORDER BY ordinal_position;
    `)
    
    if (result.rows.length === 0) {
      console.log('❌ Table batch_results not found in public schema')
    } else {
      console.log('✅ batch_results columns:')
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`)
      })
    }
    
    await client.end()
  } catch (err) {
    console.log('❌ Error:', err.message)
    console.log('\nTrying Supabase REST API instead...')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Just try to select all columns
    const { data, error } = await supabase
      .from('batch_results')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Select error:', error.message)
    } else {
      console.log('✅ Can select from batch_results')
      if (data && data.length > 0) {
        console.log('   Columns:', Object.keys(data[0]).join(', '))
      } else {
        console.log('   (No data to show columns)')
      }
    }
  }
}

listColumns()

