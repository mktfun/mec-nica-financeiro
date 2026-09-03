const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testRpc() {
  console.log('--- TESTANDO get_daily_reconciliation_summary (02/09/2026) ---');
  const { data: res02, error: err02 } = await supabase.rpc('get_daily_reconciliation_summary', {
    p_date: '2026-09-02',
    p_force_dynamic: false
  });

  if (err02) {
    console.error('Erro na RPC 02/09:', err02);
    process.exit(1);
  }

  console.log('Data:', res02.date);
  console.log('Caixa Atual:', res02.caixa_atual);
  console.log('Caixa Tesouraria (Canal 1):', res02.caixa_tesouraria);
  console.log('Status Tesouraria:', res02.status_tesouraria);
  console.log('Pátio WIP (Canal 2):', res02.patio_wip);
  console.log('Variação Pátio ΔP4:', res02.variacao_patio_delta_p4);
  console.log('Valor Disponível Contas:', res02.valor_disp_contas);
  console.log('Subtotal Contas:', res02.subtotal_contas);
  console.log('Diferença Final:', res02.diferenca_final);
  console.log('Status Geral:', res02.status_geral);
  console.log('Fast-Path Elegível:', res02.fast_path_eligible);
  console.log('Total Lojas Detalhadas:', res02.stores?.length);

  console.log('\n--- TESTANDO auto_match_daily_transactions (02/09/2026) ---');
  const { data: matchRes, error: matchErr } = await supabase.rpc('auto_match_daily_transactions', {
    p_date: '2026-09-02'
  });

  if (matchErr) {
    console.error('Erro no auto_match:', matchErr);
    process.exit(1);
  }

  console.log('AutoMatch Result:', matchRes);
  console.log('\n✅ TESTE DE BACKEND BICANAL E ANTI-COLISÃO CONCLUÍDO COM SUCESSO!');
}

testRpc().catch(console.error);
