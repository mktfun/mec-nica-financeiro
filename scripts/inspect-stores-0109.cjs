const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectStores() {
  const wb = xlsx.readFile('C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 0109.xlsx');
  const ws = wb.Sheets['SALDO'];
  const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });

  console.log('=== SALDO RAW ROWS (first 45) ===');
  rawData.slice(0, 45).forEach((r, i) => console.log(`R${i+1}:`, JSON.stringify(r)));

  console.log('\n=== DB RPC get_daily_reconciliation_summary 2026-09-01 ===');
  const { data: rpc, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-01' });
  if (error) {
    console.error(error);
  } else {
    console.log('total_saldo_banco:', rpc.total_saldo_banco);
    console.log('saldo_positivo_itau:', rpc.saldo_positivo_itau);
    console.log('saldo_negativo_itau:', rpc.saldo_negativo_itau);
    console.log('dinheiro_mp:', rpc.dinheiro_mp);
    console.log('a_receber_manual:', rpc.a_receber_manual);
    console.log('total_patio:', rpc.total_patio);
    console.log('caixa_atual:', rpc.caixa_atual);
    console.log('caixa_anterior:', rpc.caixa_anterior);
    console.log('fluxo_caixa:', rpc.fluxo_caixa);
    console.log('faturamento_periodo:', rpc.faturamento_periodo);
    console.log('faturamento_oi_base:', rpc.faturamento_oi_base);
    console.log('faturamento_ajustes:', rpc.faturamento_ajustes);
    console.log('valor_disp_contas:', rpc.valor_disp_contas);
    console.log('v_subtotal_contas / contas_a_pagar:', rpc.contas_a_pagar, rpc.v_subtotal_contas);
    console.log('diferenca_final:', rpc.diferenca_final);
    console.log('\n=== STORES in DB ===');
    rpc.stores?.forEach(st => {
      console.log(`- ${st.store_name} (${st.store_id}): Saldo=${st.saldo_banco}, Previsto=${st.previsto_vendas_total || st.previsto_total}, Entradas=${st.ofx_entradas_total}, Dif=${st.diferenca_total}`);
    });
  }
}

inspectStores();
