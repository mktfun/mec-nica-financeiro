import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking ai_execution_logs table...');
  const { data: logs, error: lErr } = await supabase.from('ai_execution_logs').select('*').limit(1);
  console.log('ai_execution_logs sample/err:', lErr, logs);

  console.log('Checking conciliation_matches table...');
  const { data: matches, error: mErr } = await supabase.from('conciliation_matches').select('*').limit(1);
  console.log('conciliation_matches sample/err:', mErr, matches);
}

check();
