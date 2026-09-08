const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRpc() {
  const { data: sum, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-02' });
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('=== GET_DAILY_RECONCILIATION_SUMMARY (02/09/2026) ===');
  console.log('Caixa Atual:   R$', sum.caixa_atual);
  console.log('Caixa Anterior:R$', sum.caixa_anterior);
  console.log('Fluxo Caixa:   R$', sum.fluxo_caixa);
  console.log('Bancos (+):    R$', sum.total_saldo_banco_positivo);
  console.log('Itaú Negativo: R$', sum.saldo_negativo_itau);
  console.log('Dinheiro MP:   R$', sum.dinheiro_mp);
  console.log('A Receber:     R$', sum.a_receber);
  console.log('Pátio OS:      R$', sum.na_loja_os);
  console.log('Faturamento:   R$', sum.faturamento_periodo);
  console.log('Subtotal Contas: R$', sum.subtotal_contas);
  console.log('Diferença Final: R$', sum.diferenca_final);
  console.log('Status Geral:  ', sum.status_geral);
}

checkRpc();
