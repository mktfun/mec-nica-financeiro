const fs = require('fs');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function applyMigration17() {
  const sql = fs.readFileSync('supabase/migrations/20260901000017_perfect_0109_reconciliation_rpc.sql', 'utf8');
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
    console.log('✅ Migration 17 aplicada com sucesso via Management API!');
  } else {
    console.error('Erro ao aplicar Migration 17:', resp.status, await resp.text());
    process.exit(1);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: rpc, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-01' });
  if (error) {
    console.error('Erro na RPC:', error);
  } else {
    console.log('\n================ RESULTADO OFICIAL DA CONCILIAÇÃO (01/09/2026) ================');
    console.log(`🏦 Saldo Bancos Itaú Positivos: R$ ${rpc.total_saldo_banco_positivo}`);
    console.log(`📉 (-) Cheque Especial Real:    -R$ ${rpc.saldo_negativo_itau}`);
    console.log(`💵 Dinheiro MP (Cofre):          R$ ${rpc.dinheiro_mp}`);
    console.log(`📑 A Receber (Títulos):          R$ ${rpc.a_receber}`);
    console.log(`🚗 Na Loja OS (Pátio 54 OSs):    R$ ${rpc.na_loja_os}`);
    console.log(`💰 CAIXA ATUAL CONSOLIDADO:      R$ ${rpc.caixa_atual}`);
    console.log(`⏪ Caixa Anterior (31/08):       R$ ${rpc.caixa_anterior}`);
    console.log(`🔄 FLUXO DE CAIXA:               R$ ${rpc.fluxo_caixa}`);
    console.log(`📊 Faturamento Base OI:          R$ ${rpc.faturamento_oi_base}`);
    console.log(`➕ Entradas Justificadas DRE:    R$ ${rpc.faturamento_ajustes}`);
    console.log(`📈 FATURAMENTO ATUAL TOTAL:      R$ ${rpc.faturamento_periodo}`);
    console.log(`💳 Disponível para Contas:       R$ ${rpc.valor_disp_contas}`);
    console.log(`🧾 Subtotal Contas a Pagar:      R$ ${rpc.subtotal_contas}`);
    console.log(`🎯 DIFERENÇA FINAL:              R$ ${rpc.diferenca_final}`);
    console.log(`🟢 STATUS GERAL:                 ${rpc.status_geral}`);
    console.log('===============================================================================\n');
  }
}

applyMigration17();
