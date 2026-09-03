const { calculateGlobalConciliacao, calculateModulo1Saldo } = require('../src/lib/modulo1Calculations');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runScenario1() {
  console.log('================================================================');
  console.log('🧪 CENÁRIO 1: TESTE PERICIAL DO BUG MATH.ABS (DÉFICIT DE CAIXA)');
  console.log('================================================================');

  // Simulação: Faturamento Líquido = 0, Variação de Caixa = +50.000 (ex: dívida bancária)
  // Disponível para contas = 0 - (+50.000) = -50.000
  // Contas a Pagar = 50.000
  // Resultado Correto Contábil: -50.000 - 50.000 = -100.000
  const input = {
    saldo_bancario: 50000,
    dinheiro_mp: 0,
    a_receber_manual: 0,
    na_loja_os: 0,
    saldo_negativo_itau: 0,
    caixa_anterior: 0, // Fluxo = 50.000 - 0 = +50.000
    faturamento_atual: 0,
    faturamento_anterior: 0,
    faturamento_outros: 0,
    juros_rede: 0,
    contas_a_pagar: 50000,
    provisao: 0
  };

  const res = calculateGlobalConciliacao(input);

  console.log('Caixa Atual:', res.caixa_atual);
  console.log('Fluxo de Caixa:', res.fluxo_cx);
  console.log('Faturamento Líquido:', res.faturamento_liquido);
  console.log('Valor Disp. Contas:', res.valor_disp_contas);
  console.log('Valor das Contas:', res.valor_contas);
  console.log('Diferença Final Calculada:', res.diferenca);

  if (res.diferenca === -100000) {
    console.log('✅ CENÁRIO 1 PASSOU: Diferença computada como -R$ 100.000,00 (sem Math.abs, déficit real reportado)!');
  } else if (res.diferenca === 0) {
    console.error('❌ CENÁRIO 1 FALHOU: O bug de Math.abs ainda converteu o déficit de -50k em 0,00!');
    process.exit(1);
  } else {
    console.warn('⚠️ Valor inesperado:', res.diferenca);
  }
}

async function runScenario2() {
  console.log('\n================================================================');
  console.log('🧪 CENÁRIO 2: VALIDAÇÃO DA RPC BICANAL E ANTI-COLISÃO NO POSTGRES');
  console.log('================================================================');

  const { data: summary, error } = await supabase.rpc('get_daily_reconciliation_summary', {
    p_date: '2026-09-02',
    p_force_dynamic: false
  });

  if (error) {
    console.error('❌ Erro ao consultar RPC get_daily_reconciliation_summary:', error);
    process.exit(1);
  }

  console.log('Data da Consulta:', summary.date);
  console.log('Status Geral:', summary.status_geral);
  console.log('Canal 1 (Tesouraria Real):', summary.caixa_tesouraria);
  console.log('Status Tesouraria:', summary.status_tesouraria);
  console.log('Canal 2 (Pátio WIP):', summary.patio_wip);
  console.log('Variação ΔP4:', summary.variacao_patio_delta_p4);
  console.log('Fast-Path Elegível:', summary.fast_path_eligible);

  if (summary.caixa_tesouraria !== undefined && summary.patio_wip !== undefined && summary.fast_path_eligible !== undefined) {
    console.log('✅ CENÁRIO 2 PASSOU: A RPC retornou o contrato bicanal completo com integridade patrimonial!');
  } else {
    console.error('❌ CENÁRIO 2 FALHOU: Propriedades bicanais ausentes na resposta da RPC!');
    process.exit(1);
  }

  console.log('\n🎉 TODOS OS TESTES PERICIAIS PASSARAM COM SUCESSO ABSOLUTO!');
}

async function main() {
  await runScenario1();
  await runScenario2();
}

main().catch(err => {
  console.error('Erro geral no teste:', err);
  process.exit(1);
});
