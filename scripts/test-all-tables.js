import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const knownTables = [
  'stores',
  'patio_os',
  'transactions',
  'import_logs',
  'reconciliations',
  'receivables',
  'ai_settings',
  'ai_execution_logs',
  'ai_logs',
  'bot_logs',
  'conciliation_matches',
  'reconciliacoes_triplas',
  'goals',
  'daily_snapshots',
  'bot_credentials'
];

async function checkAll() {
  for (const t of knownTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t}: ERROR ->`, error.message);
    } else {
      console.log(`Table ${t}: OK (rows: ${data.length})`);
      if (data.length > 0) {
        console.log(`  Sample keys for ${t}:`, Object.keys(data[0]));
      }
    }
  }
}

checkAll();
