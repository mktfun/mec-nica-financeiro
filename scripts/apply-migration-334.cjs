const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  const sql = fs.readFileSync('supabase/migrations/20260901000011_fix_canonical_store_ofx_entries_and_split.sql', 'utf8');
  console.log('Aplicando migração 20260901000011_fix_canonical_store_ofx_entries_and_split.sql...');

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
    console.log('✅ Migração 20260901000011 aplicada com sucesso via Management API!');
  } else {
    console.log('API response status:', resp.status, await resp.text());
  }

  // Testar a RPC get_daily_reconciliation_summary para 2026-09-01
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-01' });
  if (rpcError) {
    console.error('Erro no teste da RPC:', rpcError);
    return;
  }

  console.log('\n=== AUDITORIA GERAL (2026-09-01) ===');
  console.log('Faturamento OI Base:', rpcData.faturamento_oi_base);
  console.log('Faturamento Ajustes:', rpcData.faturamento_ajustes);
  console.log('Faturamento Periodo:', rpcData.faturamento_periodo);
  console.log('Contas Manual:', rpcData.contas_manual);
  console.log('Subtotal Contas:', rpcData.subtotal_contas);
  console.log('Diferenca Final:', rpcData.diferenca_final);

  console.log('\n=== AUDITORIA DO SPLIT DAS LOJAS RETORNADO PELA RPC ===');
  console.log(`Total de lojas retornadas: ${rpcData.stores ? rpcData.stores.length : 0}`);
  (rpcData.stores || []).forEach(st => {
    console.log(`Loja: ${st.store_name.padEnd(20)} | OFX Entradas: R$ ${Number(st.entradas_realizadas || st.ofx_entradas_total || 0).toFixed(2).padStart(8)} | Previsto: R$ ${Number(st.entradas_previsto || st.previsto_vendas_total || 0).toFixed(2).padStart(8)} | Dif Entradas: R$ ${Number(st.diferenca_entradas || 0).toFixed(2).padStart(8)} | Saídas OFX: R$ ${Number(st.saidas_ofx || 0).toFixed(2).padStart(8)} | Contas: R$ ${Number(st.contas_loja || 0).toFixed(2).padStart(8)} | Dif Saídas: R$ ${Number(st.diferenca_saidas || 0).toFixed(2).padStart(8)} | Dif Geral: R$ ${Number(st.diferenca || 0).toFixed(2).padStart(8)}`);
  });
}

applyMigration();
