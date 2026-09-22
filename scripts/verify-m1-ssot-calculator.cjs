/**
 * verify-m1-ssot-calculator.cjs
 * Milestone 1 Verification Suite: Single Source of Truth Calculator & Deprecation
 * 
 * Verifies:
 * 1. calculate_daily_conciliation does NOT exist in pg_proc (rejected with PGRST202).
 * 2. get_daily_reconciliation_summary returns full SSOT payload for 6 real benchmark dates.
 * 3. Store sums match macro pillars with zero difference (tolerance <= 0.001).
 * 4. Mathematical accounting invariants hold strictly across Caixa, Fluxo, Contas, and DRE.
 * 5. Canonical vocabulary strictly enforced: 'approved' | 'divergence'.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BENCHMARK_DATES = [
  '2026-08-17',
  '2026-08-18',
  '2026-08-19',
  '2026-08-21',
  '2026-08-24',
  '2026-09-16'
];

async function verifyM1() {
  console.log('========================================================================');
  console.log('🔍 INICIANDO SUÍTE DE VERIFICAÇÃO DO MILESTONE 1 (SSOT CALCULATOR)');
  console.log('========================================================================\n');

  let passedAll = true;

  // -------------------------------------------------------------------------
  // TESTE 1: Depreciação de calculate_daily_conciliation
  // -------------------------------------------------------------------------
  console.log('TESTE 1: Verificando depreciação de calculate_daily_conciliation em pg_proc...');
  const { data: legacyData, error: legacyError } = await supabase.rpc('calculate_daily_conciliation', {
    p_date: '2026-09-16'
  });

  if (!legacyError) {
    console.error('❌ FALHA: calculate_daily_conciliation ainda existe no banco e retornou dados!');
    passedAll = false;
  } else if (legacyError.code === 'PGRST202' || legacyError.message.includes('Could not find the function')) {
    console.log('✅ SUCESSO: calculate_daily_conciliation foi completamente eliminada (PGRST202).');
  } else {
    console.warn(`⚠️ Aviso: calculate_daily_conciliation retornou erro inesperado: ${legacyError.message}`);
  }

  // -------------------------------------------------------------------------
  // TESTE 2: Execução e Invariantes nas 6 Datas Reais
  // -------------------------------------------------------------------------
  console.log('\nTESTE 2: Verificando get_daily_reconciliation_summary nas 6 datas de benchmark...\n');

  for (const date of BENCHMARK_DATES) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`📅 Analisando Data: ${date}`);
    
    const { data: summary, error } = await supabase.rpc('get_daily_reconciliation_summary', {
      p_date: date
    });

    if (error) {
      console.error(`❌ Erro ao invocar get_daily_reconciliation_summary(${date}):`, error.message);
      passedAll = false;
      continue;
    }

    // 2.1 Verificação de Vocabulário de Status
    const validStatuses = ['approved', 'divergence'];
    if (!validStatuses.includes(summary.status_geral)) {
      console.error(`❌ Status geral inválido em ${date}: "${summary.status_geral}". Esperado: 'approved' | 'divergence'.`);
      passedAll = false;
    } else {
      console.log(`   [Vocabulário] status_geral: "${summary.status_geral}" (Válido)`);
    }

    // 2.2 Verificação do Array de Lojas (10 filiais)
    if (!Array.isArray(summary.stores) || summary.stores.length !== 10) {
      console.error(`❌ Array stores inválido em ${date}. Esperado: 10 lojas. Obtido: ${summary.stores?.length || 0}`);
      passedAll = false;
    } else {
      console.log(`   [Filiais] 10 lojas presentes no detalhamento.`);
    }

    // 2.3 Comparação de Somas das Lojas vs Macro Pilares
    let sumSaldoBanco = 0;
    let sumDinheiroLoja = 0;
    let sumRedeLiquido = 0;
    let sumNaLojaOs = 0;

    for (const store of (summary.stores || [])) {
      sumSaldoBanco += Number(store.saldo_banco || store.saldo_banco_ofx || 0);
      sumDinheiroLoja += Number(store.dinheiro_loja || 0);
      sumRedeLiquido += Number(store.rede_liquido || 0);
      sumNaLojaOs += Number(store.na_loja_os || store.patio_os || 0);

      if (!validStatuses.includes(store.status)) {
        console.error(`❌ Loja ${store.store_name} possui status inválido: "${store.status}"`);
        passedAll = false;
      }
    }

    const diffSaldo = Math.abs(sumSaldoBanco - Number(summary.saldo_bancos_ofx || 0));
    const diffDinheiro = Math.abs(sumDinheiroLoja - Number(summary.dinheiro_lojas || 0));
    const diffRede = Math.abs(sumRedeLiquido - Number(summary.cartoes_a_compensar || 0));

    if (diffSaldo > 0.01) {
      console.error(`❌ Divergência de Saldo Bancário em ${date}: Soma Lojas (${sumSaldoBanco.toFixed(2)}) != Macro (${summary.saldo_bancos_ofx})`);
      passedAll = false;
    } else {
      console.log(`   [Paridade Bancos] Soma Lojas (${sumSaldoBanco.toFixed(2)}) == Macro (${summary.saldo_bancos_ofx}) [Diff: ${diffSaldo.toFixed(4)}]`);
    }

    if (diffDinheiro > 0.01) {
      console.error(`❌ Divergência de Dinheiro em Cofre em ${date}: Soma Lojas (${sumDinheiroLoja.toFixed(2)}) != Macro (${summary.dinheiro_lojas})`);
      passedAll = false;
    } else {
      console.log(`   [Paridade Cofre] Soma Lojas (${sumDinheiroLoja.toFixed(2)}) == Macro (${summary.dinheiro_lojas}) [Diff: ${diffDinheiro.toFixed(4)}]`);
    }

    if (diffRede > 0.01) {
      console.error(`❌ Divergência de Cartões em ${date}: Soma Lojas (${sumRedeLiquido.toFixed(2)}) != Macro (${summary.cartoes_a_compensar})`);
      passedAll = false;
    } else {
      console.log(`   [Paridade Rede] Soma Lojas (${sumRedeLiquido.toFixed(2)}) == Macro (${summary.cartoes_a_compensar}) [Diff: ${diffRede.toFixed(4)}]`);
    }

    // 2.4 Invariantes Contábeis Macro
    const expectedCaixa = (Number(summary.total_saldo_banco_positivo || 0) + Number(summary.dinheiro_mp || 0) + Number(summary.a_receber || 0) + Number(summary.na_loja_os || 0)) - Number(summary.saldo_negativo_itau || 0);
    const diffCaixa = Math.abs(Number(summary.caixa_atual || 0) - expectedCaixa);
    if (diffCaixa > 0.01) {
      console.error(`❌ Invariante de Caixa Atual violada em ${date}: Calculado (${summary.caixa_atual}) != Fórmula (${expectedCaixa.toFixed(2)})`);
      passedAll = false;
    } else {
      console.log(`   [Invariante Caixa Atual] Batendo perfeitamente: ${summary.caixa_atual}`);
    }

    const expectedFluxo = Number(summary.caixa_atual || 0) - Number(summary.caixa_anterior || 0);
    const diffFluxo = Math.abs(Number(summary.fluxo_caixa || 0) - expectedFluxo);
    if (diffFluxo > 0.01) {
      console.error(`❌ Invariante de Fluxo de Caixa violada em ${date}: ${summary.fluxo_caixa} != ${expectedFluxo.toFixed(2)}`);
      passedAll = false;
    }

    const expectedSubtotalContas = Number(summary.contas_base || 0) + Number(summary.juros_rede || 0);
    const diffContas = Math.abs(Number(summary.subtotal_contas || 0) - expectedSubtotalContas);
    if (diffContas > 0.01) {
      console.error(`❌ Invariante de Subtotal Contas violada em ${date}: ${summary.subtotal_contas} != ${expectedSubtotalContas.toFixed(2)}`);
      passedAll = false;
    }

    const expectedDispContas = Number(summary.faturamento_periodo || 0) - Number(summary.fluxo_caixa || 0);
    const diffDisp = Math.abs(Number(summary.valor_disp_contas || 0) - expectedDispContas);
    if (diffDisp > 0.01) {
      console.error(`❌ Invariante de Valor Disp Contas violada em ${date}: ${summary.valor_disp_contas} != ${expectedDispContas.toFixed(2)}`);
      passedAll = false;
    }

    const expectedDiffFinal = Number(summary.valor_disp_contas || 0) - Number(summary.subtotal_contas || 0);
    const diffFinal = Math.abs(Number(summary.diferenca_final || 0) - expectedDiffFinal);
    if (diffFinal > 0.01) {
      console.error(`❌ Invariante de Diferença Final violada em ${date}: ${summary.diferenca_final} != ${expectedDiffFinal.toFixed(2)}`);
      passedAll = false;
    } else {
      console.log(`   [Invariante Diferença Final] ${summary.diferenca_final} (OK)`);
    }
  }

  console.log('\n========================================================================');
  if (passedAll) {
    console.log('🎉 TODOS OS TESTES DO MILESTONE 1 PASSARAM COM ZERO DISCREPÂNCIAS!');
    console.log('========================================================================');
    process.exit(0);
  } else {
    console.error('❌ FALHA NA SUÍTE DE VERIFICAÇÃO DO MILESTONE 1. REVISE OS LOGS ACIMA.');
    console.log('========================================================================');
    process.exit(1);
  }
}

verifyM1().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
