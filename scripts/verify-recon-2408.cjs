const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: summary, error } = await s.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('=== AUDITORIA DINÂMICA DA CONCILIAÇÃO 24/08/2026 ===');
  console.log('1. Saldo Bancos OFX:', summary.saldo_bancos_ofx);
  console.log('2. Dinheiro no Cofre (Lojas):', summary.dinheiro_em_lojas);
  console.log('3. Total Saldo Bancos (Pilar 1):', summary.total_saldo_banco);
  console.log('4. Dinheiro MP (Pilar 2):', summary.dinheiro_mp);
  console.log('5. A Receber (Pilar 3):', summary.a_receber);
  console.log('6. NA LOJA OS (Pilar 4 PÁTIO):', summary.na_loja_os);
  console.log('7. Caixa Atual (Soma 4 Pilares):', summary.caixa_atual);
  console.log('8. Caixa Anterior:', summary.caixa_anterior);
  console.log('9. Fluxo de Caixa:', summary.fluxo_caixa);
  console.log('10. Faturamento do Período:', summary.faturamento_periodo);
  console.log('11. Valor Disponível Contas:', summary.valor_disp_contas);
  console.log('12. Subtotal Contas:', summary.subtotal_contas);
  console.log('13. Diferença Final:', summary.diferenca_final);
  console.log('14. Status Geral:', summary.status_geral);

  console.log('\n--- PÁTIO POR LOJA ---');
  let sumPatio = 0;
  summary.stores.forEach(st => {
    sumPatio += Number(st.na_loja_os || 0);
    console.log(`Loja: ${st.store_name.padEnd(25)} | Pátio OS: R$ ${Number(st.na_loja_os).toFixed(2).padStart(10)}`);
  });
  console.log(`SOMA TOTAL DO PÁTIO: R$ ${sumPatio.toFixed(2)}`);
}
main();
