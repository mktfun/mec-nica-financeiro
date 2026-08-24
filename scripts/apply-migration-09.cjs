const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration09() {
  const sql = fs.readFileSync('supabase/migrations/20260824000009_fix_store_reconciliation_array_in_rpc.sql', 'utf8');
  console.log('Aplicando migração 20260824000009...');

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
    console.log('✅ Migração 09 aplicada com sucesso via Management API!');
  } else {
    console.log('API response status:', resp.status, await resp.text());
  }

  // Agora vamos testar a RPC e inspecionar stores e stores_detail
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  if (rpcError) {
    console.error('Erro no teste da RPC:', rpcError);
    return;
  }

  console.log('\n=== AUDITORIA DO ARRAY STORES RETORNADO PELA RPC ===');
  console.log(`Total de lojas retornadas: ${rpcData.stores ? rpcData.stores.length : 0}`);
  (rpcData.stores || []).forEach(st => {
    console.log(`Loja: ${st.store_name.padEnd(25)} | Saldo Bancos: R$ ${Number(st.saldo_banco).toFixed(2).padStart(10)} | Dinheiro: R$ ${Number(st.dinheiro_loja).toFixed(2).padStart(8)} | Maq: R$ ${Number(st.maquininha).toFixed(2).padStart(8)} | PIX: R$ ${Number(st.pix).toFixed(2).padStart(8)} | Pátio OS: R$ ${Number(st.na_loja_os).toFixed(2).padStart(10)} | Diferença: R$ ${Number(st.diferenca).toFixed(2).padStart(8)}`);
  });
}
applyMigration09();
