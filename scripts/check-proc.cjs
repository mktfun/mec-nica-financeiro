const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkProc() {
  const { data, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-01' });
  console.log('01/09 test:', data ? 'OK' : error);
  
  const { data: d2, error: e2 } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-02' });
  console.log('02/09 test:', d2 ? 'OK' : e2);
}

checkProc();
