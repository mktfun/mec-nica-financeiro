const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await s.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  if (error) {
    console.error('RPC Error:', error);
    return;
  }
  console.log('=== RETORNO DA RPC GET_DAILY_RECONCILIATION_SUMMARY (24/08/2026) ===');
  console.log('Caixa Atual:', data.caixa_atual);
  console.log('Fluxo Caixa:', data.fluxo_caixa);
  console.log('Valor Disp Contas:', data.valor_disp_contas);
  console.log('Subtotal Contas:', data.subtotal_contas);
  console.log('Diferenca Final:', data.diferenca_final);
  console.log('Status Geral:', data.status_geral);
  console.log('\n--- FILIAIS (PREVISTO = ENTRADAS OFX | DIFERENCA = PENDENTES) ---');
  data.stores.forEach(st => {
    console.log(`Loja: ${st.store_name.padEnd(25)} | Previsto OFX: R$ ${Number(st.previsto_ofx).toFixed(2).padStart(9)} | Maq: R$ ${Number(st.maquininha).toFixed(2).padStart(9)} | PIX OS: R$ ${Number(st.pix).toFixed(2).padStart(8)} | Justif: R$ ${Number(st.justificado || 0).toFixed(2).padStart(8)} | Diferenca: R$ ${Number(st.diferenca).toFixed(2).padStart(8)} | Status: ${st.status}`);
  });
}
main();
