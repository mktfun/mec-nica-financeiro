const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'];

async function testAll() {
  console.log('================================================================');
  console.log('🏛️ AUDITORIA DA CADEIA TEMPORAL SEQUENCIAL — SETEMBRO 2026');
  console.log('================================================================\n');

  for (const dt of dates) {
    const { data: d } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: dt, p_force_dynamic: false });
    console.log(`📅 DATA ${dt}:`);
    console.log(`   Caixa Atual:    R$ ${Number(d.caixa_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10)}`);
    console.log(`   Caixa Anterior: R$ ${Number(d.caixa_anterior).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10)}`);
    console.log(`   Fluxo Caixa:    R$ ${Number(d.fluxo_caixa).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10)}`);
    console.log(`   Pátio OS:       R$ ${Number(d.total_patio).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10)}`);
    console.log(`   Faturamento:    R$ ${Number(d.faturamento_periodo).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10)}`);
    console.log(`   Contas Pagas:   R$ ${Number(d.subtotal_contas).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10)}`);
    console.log(`   Diferença DRE:  R$ ${Number(d.diferenca_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 }).padStart(10)} [${(d.status_geral || 'APPROVED').toUpperCase()}]\n`);
  }
}

testAll().catch(console.error);
