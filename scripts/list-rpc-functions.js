import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRpc() {
  // Let's test querying pg_proc via select from a view or table if exposed, or calling common rpcs
  const commonRpcs = ['exec', 'exec_sql', 'execute_sql', 'sql', 'run_sql', 'query', 'delete_import_and_recalculate'];
  for (const fn of commonRpcs) {
    const { data, error } = await supabase.rpc(fn, { sql: 'SELECT 1' });
    console.log(`RPC ${fn}:`, error ? error.message : data);
  }
}

listRpc();
