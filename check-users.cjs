const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env
const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing users:", error);
    return;
  }
  
  const mktUser = users.users.find(u => u.email === 'mktfunil1@gmail.com');
  if (mktUser) {
    console.log("User exists:", mktUser.email, "id:", mktUser.id);
    console.log("Updating password...");
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(mktUser.id, {
      password: 'Mktfunil8563*'
    });
    if (updateError) {
      console.error("Failed to update password:", updateError);
    } else {
      console.log("Password updated successfully.");
    }
  } else {
    console.log("User mktfunil1@gmail.com does NOT exist.");
  }
}

run();
