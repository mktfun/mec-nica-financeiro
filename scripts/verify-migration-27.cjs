const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
  console.log('Verificando Migration 27 (Pipeline Sessions e RPCs determinísticas)...');

  const testDate = '2026-09-02';

  // 1. Testar RPC get_pipeline_session_state
  const { data: sessionState, error: getErr } = await supabase.rpc('get_pipeline_session_state', {
    p_target_date: testDate
  });

  if (getErr) {
    console.error('❌ Erro na RPC get_pipeline_session_state:', getErr);
    process.exit(1);
  }

  console.log('✅ RPC get_pipeline_session_state executada com sucesso!');
  console.log(`- Target Date: ${sessionState.target_date}`);
  console.log(`- Current Step: ${sessionState.current_step}`);
  console.log(`- Selected Mode: ${sessionState.selected_mode}`);
  console.log(`- Total OSs no pátio da data: ${sessionState.metrics.stage1_os.total_os}`);
  console.log(`- Total POS transações: ${sessionState.metrics.stage2_rede.total_pos}`);

  // 2. Testar RPC save_pipeline_step_progress
  const { data: savedState, error: saveErr } = await supabase.rpc('save_pipeline_step_progress', {
    p_target_date: testDate,
    p_step: 1,
    p_step_name: 'stage_1_os',
    p_step_data: { test: true },
    p_mark_completed: false,
    p_selected_mode: 'manual'
  });

  if (saveErr) {
    console.error('❌ Erro na RPC save_pipeline_step_progress:', saveErr);
    process.exit(1);
  }

  console.log('✅ RPC save_pipeline_step_progress executada com sucesso!');
  console.log(`- Modo selecionado gravado: ${savedState.selected_mode}`);

  // 3. Testar RPC match_stage2_rede_os
  const { data: matchResult, error: matchErr } = await supabase.rpc('match_stage2_rede_os', {
    p_target_date: testDate
  });

  if (matchErr) {
    console.error('❌ Erro na RPC match_stage2_rede_os:', matchErr);
    process.exit(1);
  }

  console.log('✅ RPC match_stage2_rede_os executada com sucesso!');
  console.log(`- Matches executados: ${matchResult.matched_count}`);
  console.log(`- Colisões detectadas: ${matchResult.collisions_count}`);
  console.log(`- Total Rede Líquido apurado: R$ ${Number(matchResult.totals.rede_liquido).toFixed(2)}`);

  console.log('\n🎉 TODOS OS OBJETOS DA MIGRATION 27 FORAM VERIFICADOS COM SUCESSO!');
}

verify().catch(console.error);
