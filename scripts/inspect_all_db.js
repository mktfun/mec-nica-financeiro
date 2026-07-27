import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAll() {
  console.log('--- TABLES INSPECTION ---');
  
  // Check conciliation_matches without filter
  const { data: cmAll, error: cmErr } = await supabase.from('conciliation_matches').select('*');
  console.log('conciliation_matches total count:', cmAll ? cmAll.length : 'Error:', cmErr);
  if (cmAll && cmAll.length > 0) {
    console.log('Sample conciliation_match:', cmAll[0]);
  }

  // Check ai_execution_logs or similar tables
  const { data: aiAll, error: aiErr } = await supabase.from('ai_execution_logs').select('*');
  console.log('ai_execution_logs count:', aiAll ? aiAll.length : 'Error:', aiErr);

  // Check reconciliations
  const { data: recAll, error: recErr } = await supabase.from('reconciliations').select('*');
  console.log('reconciliations total count:', recAll ? recAll.length : 'Error:', recErr);
  if (recAll && recAll.length > 0) {
    console.log('Sample reconciliation:', recAll[0]);
  }

  // Check import_logs
  const { data: impAll, error: impErr } = await supabase.from('import_logs').select('*');
  console.log('import_logs total count:', impAll ? impAll.length : 'Error:', impErr);
  if (impAll && impAll.length > 0) {
    console.log('Sample import_log:', impAll[0]);
  }

  // Check patio_os
  const { data: patioAll, error: patioErr } = await supabase.from('patio_os').select('*');
  console.log('patio_os total count:', patioAll ? patioAll.length : 'Error:', patioErr);

  // Check transactions
  const { data: txAll, error: txErr } = await supabase.from('transactions').select('*');
  console.log('transactions total count:', txAll ? txAll.length : 'Error:', txErr);
}

inspectAll().catch(console.error);
