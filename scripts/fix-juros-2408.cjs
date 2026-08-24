const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixJuros() {
  console.log('=== ATUALIZANDO JUROS REDE PARA R$ 5.650,15 NO SNAPSHOT DE 24/08 ===');
  const { error } = await s.from('daily_snapshots')
    .update({ juros_rede: 5650.15 })
    .eq('date', '2026-08-24');

  if (error) {
    console.error('Erro ao atualizar juros:', error);
    return;
  }
  console.log('✅ Juros Rede atualizado com sucesso para R$ 5.650,15!');

  console.log('\n=== TESTANDO RPC CONSOLIDADA ===');
  const { data: rpc, error: rpcErr } = await s.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  if (rpcErr) {
    console.error('Erro RPC:', rpcErr);
    return;
  }

  console.log('Faturamento:', rpc.faturamento_periodo);
  console.log('Valor Disp Contas:', rpc.valor_disp_contas);
  console.log('Contas Manual:', rpc.contas_manual);
  console.log('Juros Rede:', rpc.juros_rede);
  console.log('Subtotal Contas:', rpc.subtotal_contas);
  console.log('Diferenca Final:', rpc.diferenca_final);
  console.log('Status Geral:', rpc.status_geral);
}
fixJuros();
