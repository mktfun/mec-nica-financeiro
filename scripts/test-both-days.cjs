const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testBoth() {
  const dates = ['2026-09-01', '2026-09-02'];
  for (const d of dates) {
    const { data: sum, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: d });
    if (error) {
      console.error(`Erro em ${d}:`, error);
      continue;
    }
    console.log(`\n📅 DATA ${d}:`);
    console.log(`- Caixa Atual:    R$ ${Number(sum.caixa_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`- Caixa Anterior: R$ ${Number(sum.caixa_anterior).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`- Fluxo Caixa:    R$ ${Number(sum.fluxo_caixa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`- Pátio OS:       R$ ${Number(sum.na_loja_os).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`- Diferença:      R$ ${Number(sum.diferenca_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} [${sum.status_geral.toUpperCase()}]`);
  }
}

testBoth();
