import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('Inspecting conciliation_matches table structure...');
  const { data: cm, error: cmErr } = await supabase.from('conciliation_matches').select('*').limit(1);
  console.log('cm:', cm);

  // Check if we can add columns or create ai_execution_logs using rpc or direct DDL if allowed, or check what tables exist in information_schema
  const { data: tables, error: tErr } = await supabase.rpc('get_tables').catch(() => ({ data: null, error: 'no rpc' }));
  console.log('rpc get_tables:', tables || tErr);
}

inspectSchema();
