const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  const sql = fs.readFileSync('supabase/migrations/20260901000013_fix_canonical_odometro_and_step2_justifications.sql', 'utf8');
  console.log('Aplicando migração 20260901000013_fix_canonical_odometro_and_step2_justifications.sql...');

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
    console.log('✅ Migração 20260901000013 aplicada com sucesso via Management API!');
  } else {
    console.log('API response status:', resp.status, await resp.text());
  }

  // Testar a RPC get_daily_reconciliation_summary para 2026-09-01 com force dynamic
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_daily_reconciliation_summary', { 
    p_date: '2026-09-01',
    p_force_dynamic: true 
  });
  if (rpcError) {
    console.error('Erro no teste da RPC:', rpcError);
    return;
  }

  console.log('\n=== AUDITORIA DO RESUMO GERAL (2026-09-01) ===');
  console.log(`Saldo Bancos Positivo: R$ ${rpcData.saldo_bancos_positivo}`);
  console.log(`Saldo Negativo Itaú:  R$ ${rpcData.saldo_negativo_itau}`);
  console.log(`Total Saldo Banco:    R$ ${rpcData.total_saldo_banco}`);
  console.log(`Caixa Atual:          R$ ${rpcData.caixa_atual}`);
  console.log(`Caixa Anterior:       R$ ${rpcData.caixa_anterior}`);
  console.log(`Fluxo de Caixa:       R$ ${rpcData.fluxo_caixa}`);
  console.log(`Odômetro Hoje:        R$ ${rpcData.odometro_hoje}`);
  console.log(`Odômetro Anterior:    R$ ${rpcData.faturamento_anterior}`);
  console.log(`Faturamento OI Base:  R$ ${rpcData.faturamento_oi_base}`);
  console.log(`Faturamento Ajustes:  R$ ${rpcData.faturamento_ajustes}`);
  console.log(`Faturamento Período:  R$ ${rpcData.faturamento_periodo}`);
  console.log(`Valor Disp. Contas:   R$ ${rpcData.valor_disp_contas}`);
  console.log(`Contas Manual:        R$ ${rpcData.contas_manual}`);
  console.log(`Subtotal Contas:      R$ ${rpcData.subtotal_contas}`);
  console.log(`Diferença Final:      R$ ${rpcData.diferenca_final}`);
  console.log(`Status Geral:         ${rpcData.status_geral}`);
}

applyMigration();
