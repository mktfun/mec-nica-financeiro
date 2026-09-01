require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testDates() {
  const dates = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-28', '2026-08-31', '2026-09-01'];
  
  for (const d of dates) {
    console.log('----------------------------------------------------');
    console.log('DATE: ' + d);
    const { data, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: d });
    if (error) {
      console.error('Error on ' + d + ':', error);
      continue;
    }
    console.log('is_closed: ' + data.is_closed);
    console.log('Saldo Bancos Positivo: ' + data.saldo_bancos_positivo);
    console.log('Saldo Negativo Itau: ' + data.saldo_negativo_itau);
    console.log('Dinheiro Lojas: ' + data.dinheiro_lojas);
    console.log('Cartoes a Compensar: ' + data.cartoes_a_compensar);
    console.log('Caixa Atual: ' + data.caixa_atual);
    console.log('Caixa Anterior: ' + data.caixa_anterior);
    console.log('Fluxo Caixa: ' + data.fluxo_caixa);
    console.log('Faturamento Periodo: ' + data.faturamento_periodo);
    console.log('Valor Disp Contas: ' + data.valor_disp_contas);
    console.log('Subtotal Contas: ' + data.subtotal_contas);
    console.log('Diferenca Final: ' + data.diferenca_final);
    console.log('Status Geral: ' + data.status_geral);
    console.log('Stores count: ' + (data.stores ? data.stores.length : 0));
    if (data.stores && data.stores.length > 0) {
      console.log('Lojas:', data.stores.map(s => s.store_name + ': Saldo=' + s.saldo_banco + ', OS=' + s.na_loja_os + ', Rede=' + s.rede_liquido).join(' | '));
    }
  }
}
testDates();
