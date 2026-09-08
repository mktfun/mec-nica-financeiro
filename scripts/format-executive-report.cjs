const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function formatReport() {
  const { data: snap } = await supabase.from('daily_snapshots').select('*').eq('date', '2026-09-02').single();
  const m = snap.metadata;

  console.log('====================================================================');
  console.log('📊 PAINEL EXECUTIVO — CONCILIAÇÃO 02/09/2026');
  console.log('====================================================================');
  console.log(`1. Saldo Bancos Positivo:     R$ ${Number(m.saldo_bancos_positivo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`(-) Cheque Especial Itaú:     R$ ${Number(m.saldo_negativo_itau).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`2. Dinheiro MP (Cofre):       R$ ${Number(m.dinheiro_mp).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`3. A Receber:                 R$ ${Number(m.a_receber).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`4. Na Loja OS (Pátio Total):  R$ ${Number(m.total_patio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log('--------------------------------------------------------------------');
  console.log(`💰 CAIXA ATUAL DO DIA:         R$ ${Number(m.caixa_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🔙 CAIXA ANTERIOR (01/09):     R$ ${Number(m.caixa_anterior).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`📈 FLUXO DE CAIXA:             R$ ${Number(m.fluxo_caixa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log('--------------------------------------------------------------------');
  console.log(`🧾 Contas a Pagar Faturadas:   R$ ${Number(m.contas_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`📊 Faturamento OI Base:        R$ ${Number(m.faturamento_oi_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log('====================================================================\n');

  console.log('🏪 FECHAMENTO POR FILIAL (10 LOJAS):');
  m.stores.forEach(s => {
    console.log(`- ${s.store_name.padEnd(25, ' ')} | Saldo: R$ ${Number(s.saldo_banco).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(11, ' ')} | Pátio: R$ ${Number(s.na_loja_os).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10, ' ')} | Rede Líq: R$ ${Number(s.rede_liquido).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(9, ' ')} | Contas: R$ ${Number(s.contas_loja_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(9, ' ')}`);
  });
}

formatReport();
