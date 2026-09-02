const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  const sql = fs.readFileSync('supabase/migrations/20260901000012_fix_store_split_linear_subtraction_and_expenses.sql', 'utf8');
  console.log('Aplicando migração 20260901000012_fix_store_split_linear_subtraction_and_expenses.sql...');

  const projectRef = process.env.SUPABASE_PROJECT_REF || (process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]);
  const sqlEndpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const resp = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (resp.ok) {
    console.log('✅ Migração 20260901000012 aplicada com sucesso via Management API!');
  } else {
    console.log('API response status:', resp.status, await resp.text());
  }

  // Testar a RPC get_daily_reconciliation_summary para 2026-09-01
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-01' });
  if (rpcError) {
    console.error('Erro no teste da RPC:', rpcError);
    return;
  }

  console.log('\n=== AUDITORIA DO SPLIT LINEAR DAS LOJAS RETORNADO PELA RPC ===');
  (rpcData.stores || []).forEach(st => {
    console.log(`Loja: ${st.store_name.padEnd(25)}`);
    console.log(`   [ENTRADAS] OFX: R$ ${st.ofx_entradas_total} - Conciliadas: R$ ${st.entradas_conciliadas} = Dif: R$ ${st.diferenca_entradas}`);
    console.log(`   [SAÍDAS]   OFX: R$ ${st.ofx_saidas_total} - Conciliadas: R$ ${st.contas_conciliadas} = Dif: R$ ${st.diferenca_saidas}`);
    console.log(`   DIFERENÇA TOTAL: R$ ${st.diferenca_total} | Status: ${st.status}`);
  });
}

applyMigration();
