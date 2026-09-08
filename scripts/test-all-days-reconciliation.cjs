const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const testDates = [
  '2026-08-14',
  '2026-08-17',
  '2026-08-18',
  '2026-08-19',
  '2026-08-27',
  '2026-08-28',
  '2026-08-31',
  '2026-09-01'
];

async function checkAllDays() {
  console.log('=== TESTANDO TODAS AS DATAS NO SISTEMA ===\n');

  for (const date of testDates) {
    console.log(`----------------------------------------`);
    console.log(`📅 DATA: ${date}`);
    
    // 1. Snapshot
    const { data: snap } = await supabase
      .from('daily_snapshots')
      .select('*')
      .eq('date', date)
      .maybeSingle();

    if (!snap) {
      console.log(`❌ Snapshot NÃO ENCONTRADO para ${date}`);
    } else {
      console.log(`✅ Snapshot Encontrado:`);
      console.log(`   - is_closed: ${snap.is_closed}`);
      console.log(`   - caixa_atual: ${snap.caixa_atual}`);
      console.log(`   - faturamento: ${snap.faturamento}`);
      console.log(`   - contas: ${snap.contas_a_pagar}`);
      console.log(`   - metadata.diferenca_final: ${snap.metadata?.diferenca_final}`);
      console.log(`   - metadata.status_geral: ${snap.metadata?.status_geral}`);
    }

    // 2. RPC get_daily_reconciliation_summary
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: date });
    if (rpcErr) {
      console.log(`❌ Erro na RPC get_daily_reconciliation_summary (${date}):`, rpcErr.message);
    } else {
      console.log(`⚡ Resultado RPC:`);
      console.log(`   - Caixa Atual: ${rpcRes.caixa_atual} | Caixa Ant: ${rpcRes.caixa_anterior} | Fluxo: ${rpcRes.fluxo_caixa}`);
      console.log(`   - Faturamento: ${rpcRes.faturamento_periodo} | Disp Contas: ${rpcRes.valor_disp_contas}`);
      console.log(`   - Subtotal Contas: ${rpcRes.subtotal_contas} | Diferenca Final: ${rpcRes.diferenca_final}`);
      console.log(`   - Status Geral: ${rpcRes.status_geral}`);
      console.log(`   - Total Lojas: ${rpcRes.stores_detail?.length || 0}`);
      
      const lojasApproved = rpcRes.stores_detail?.filter(s => s.status === 'approved' || s.rede_status === 'conciliado' || s.rede_status === 'sem_movimento').length || 0;
      console.log(`   - Lojas Conciliadas / OK: ${lojasApproved}/${rpcRes.stores_detail?.length || 0}`);
    }
  }
}

checkAllDays().catch(console.error);
