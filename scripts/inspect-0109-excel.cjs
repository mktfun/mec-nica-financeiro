const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const wb = xlsx.readFile('C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 0109.xlsx');
  console.log('=== SHEETS in CONCILIAÇÃO 0109.xlsx ===', wb.SheetNames);

  for (const name of wb.SheetNames) {
    console.log(`\n=================== SHEET: ${name} ===================`);
    const ws = wb.Sheets[name];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false });
    data.forEach((row, idx) => {
      if (row && row.some(cell => cell !== undefined && cell !== '')) {
        console.log(`Row ${idx + 1}:`, JSON.stringify(row));
      }
    });
  }

  console.log('\n=================== DB SUMMARY 2026-09-01 ===================');
  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_daily_reconciliation_summary', { p_target_date: '2026-09-01' });
  if (rpcErr) {
    console.error('RPC Error:', rpcErr);
  } else {
    console.log('RPC get_daily_reconciliation_summary 2026-09-01:');
    console.log(JSON.stringify(rpcData, null, 2));
  }

  const { data: snap } = await supabase.from('daily_snapshots').select('*').eq('target_date', '2026-09-01');
  console.log('\nSnapshot in daily_snapshots for 2026-09-01:', JSON.stringify(snap, null, 2));
}

inspect();
