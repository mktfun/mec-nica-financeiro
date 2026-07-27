const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xdfzrmubststcynvwgsk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking tables in database...");

  const tables = ['ai_execution_logs', 'bot_audit_logs', 'ai_settings', 'mcp_logs', 'import_logs'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t}: ERROR ->`, error.message);
    } else {
      console.log(`Table ${t}: OK (found ${data.length} rows)`);
    }
  }
}

run();
