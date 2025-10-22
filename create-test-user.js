const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  try {
    console.log('🔐 Deleting old test user if exists...');

    // Get user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users.users.find(u => u.email === 'test@example.com');

    if (existingUser) {
      console.log(`Found existing user: ${existingUser.id}`);
      await supabase.auth.admin.deleteUser(existingUser.id);
      console.log('✓ Deleted old user');
    }

    console.log('🔐 Creating fresh test user...');

    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'password',
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    console.log('✅ Test user created successfully!');
    console.log('\nUser ID:', data.user.id);
    console.log('\n✅ You can now login with:');
    console.log('   Email: test@example.com');
    console.log('   Password: password');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
