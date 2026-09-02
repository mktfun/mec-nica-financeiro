const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectDb() {
  const dates = [
    '2026-09-01',
    '2026-08-31',
    '2026-08-28',
    '2026-08-26',
    '2026-08-25',
    '2026-08-24',
    '2026-08-21',
    '2026-08-19',
    '2026-08-18',
    '2026-08-17',
    '2026-08-14'
  ];

  console.log('=== MULTI-DATE AUDIT ===');
  for (const d of dates) {
    const { data: snap } = await supabase.from('daily_snapshots').select('*').eq('date', d).single();
    const { data: rpc, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: d });
    if (error) {
      console.log(d, 'ERROR:', error.message);
    } else {
      console.log(`${d} | Closed: ${rpc.is_closed} | RPC Caixa: ${rpc.caixa_atual} (Snap: ${snap ? snap.caixa_atual : 'none'}) | Fat: ${rpc.faturamento_periodo} | Fluxo: ${rpc.fluxo_caixa} | Contas: ${rpc.subtotal_contas} | Dif: ${rpc.diferenca_final} | Status: ${rpc.status_geral}`);
    }
  }
}

inspectDb();
