import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: Missing Supabase URL or Service Role Key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
  const targetDate = '2026-07-24';
  console.log(`====================================================`);
  console.log(`Verifying Stress Test Data for Target Date: ${targetDate}`);
  console.log(`====================================================\n`);

  const { data: stores, error: sErr } = await supabase.from('stores').select('id, name').eq('active', true);
  if (sErr) {
    console.error('Error fetching stores:', sErr);
    process.exit(1);
  }

  console.log(`Stores count: ${stores.length}`);

  let totalPatio = 0;
  let totalTx = 0;
  let totalLogs = 0;
  let totalRecs = 0;

  console.log(`Store ID | Store Name | patio_os | transactions | import_logs | reconciliations`);
  console.log(`-----------------------------------------------------------------------------------`);

  for (const s of stores) {
    const { count: patioCount } = await supabase
      .from('patio_os')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', s.id)
      .like('os_number', 'STRESS_%');

    const { count: txCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', s.id)
      .eq('target_date', targetDate);

    const { count: logCount } = await supabase
      .from('import_logs')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', s.id)
      .eq('target_date', targetDate);

    const { count: recCount } = await supabase
      .from('reconciliations')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', s.id)
      .eq('date', targetDate);

    const p = patioCount || 0;
    const t = txCount || 0;
    const l = logCount || 0;
    const r = recCount || 0;

    totalPatio += p;
    totalTx += t;
    totalLogs += l;
    totalRecs += r;

    console.log(`${s.id.padEnd(36)} | ${(s.name || '').padEnd(20)} | ${String(p).padStart(8)} | ${String(t).padStart(12)} | ${String(l).padStart(11)} | ${String(r).padStart(15)}`);
  }

  console.log(`-----------------------------------------------------------------------------------`);
  console.log(`TOTALS:                                    | ${String(totalPatio).padStart(8)} | ${String(totalTx).padStart(12)} | ${String(totalLogs).padStart(11)} | ${String(totalRecs).padStart(15)}`);
  console.log(`====================================================\n`);
}

runVerification().catch(console.error);
