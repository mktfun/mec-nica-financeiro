const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: d } = await s.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  console.log('=== RESUMO FINAL CONSOLIDADO ===');
  console.log('Saldo Bancos OFX:', d.saldo_bancos_ofx);
  console.log('Dinheiro Lojas (Cofre):', d.dinheiro_em_lojas);
  console.log('Cartões a Compensar (Maquininhas):', d.cartoes_a_compensar);
  console.log('Total Saldo Banco (Pilar 1):', d.total_saldo_banco);
  console.log('Dinheiro MP:', d.dinheiro_mp);
  console.log('A Receber:', d.a_receber);
  console.log('Pátio OS:', d.na_loja_os);
  console.log('Caixa Atual:', d.caixa_atual);
  console.log('Caixa Anterior:', d.caixa_anterior);
  console.log('Fluxo Caixa:', d.fluxo_caixa);
  console.log('Faturamento:', d.faturamento_periodo);
  console.log('Valor Disp Contas:', d.valor_disp_contas);
  console.log('Contas Manual:', d.contas_manual);
  console.log('Juros Rede:', d.juros_rede);
  console.log('Subtotal Contas:', d.subtotal_contas);
  console.log('Diferenca Final:', d.diferenca_final);
  console.log('Status Geral:', d.status_geral);
}
main();
