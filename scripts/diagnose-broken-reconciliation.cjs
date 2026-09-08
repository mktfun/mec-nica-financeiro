const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('=== 1. DIAGNÓSTICO DE DAILY_SNAPSHOTS ===');
  const { data: snaps, error: snapErr } = await supabase
    .from('daily_snapshots')
    .select('*')
    .order('date', { ascending: false })
    .limit(10);
  
  if (snapErr) console.error('Erro em daily_snapshots:', snapErr);
  else {
    console.log('Total snapshots encontrados:', snaps.length);
    snaps.forEach(s => {
      console.log(`- Data: ${s.date} | Caixa Atual: ${s.caixa_atual} | Fat: ${s.faturamento} | Dinheiro MP: ${s.dinheiro_mp} | A Receber: ${s.a_receber_manual} | Pátio: ${s.total_patio} | Fechado: ${s.is_closed}`);
    });
  }

  console.log('\n=== 2. DIAGNÓSTICO RPC get_daily_reconciliation_summary PARA 01/09/2026 ===');
  const { data: summary0109, error: rpcErr1 } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-01' });
  if (rpcErr1) {
    console.error('Erro com p_date:', rpcErr1);
    const { data: summary0109_alt, error: rpcErr2 } = await supabase.rpc('get_daily_reconciliation_summary', { p_target_date: '2026-09-01' });
    if (rpcErr2) console.error('Erro com p_target_date:', rpcErr2);
    else {
      console.log('Resultado RPC 01/09 (p_target_date):', JSON.stringify(summary0109_alt, null, 2));
    }
  } else {
    console.log('Resultado RPC 01/09 (p_date):', JSON.stringify(summary0109, null, 2));
  }

  console.log('\n=== 3. DIAGNÓSTICO RPC get_daily_reconciliation_summary PARA 31/08/2026 ===');
  const { data: summary3108, error: rpcErr31 } = await supabase.rpc('get_daily_reconciliation_summary', { p_target_date: '2026-08-31' });
  if (rpcErr31) console.error('Erro 31/08:', rpcErr31);
  else console.log('Resultado RPC 31/08:', JSON.stringify(summary3108, null, 2));

  console.log('\n=== 4. DIAGNÓSTICO DE LOJAS E RECONCILIATIONS ===');
  const { data: stores } = await supabase.from('stores').select('id, name, code');
  console.log('Lojas cadastradas:', stores?.length);

  const { data: recons } = await supabase
    .from('reconciliations')
    .select('*')
    .eq('date', '2026-09-01');
  console.log('Reconciliations para 01/09/2026:', recons?.length);
  recons?.forEach(r => {
    console.log(`- Store: ${r.store_id} | Rede: ${r.rede_liquido} | Maq: ${r.maquininha_declarado} | OFX: ${r.ofx_declarado} | Patio: ${r.na_loja_os}`);
  });
}

diagnose().catch(console.error);
