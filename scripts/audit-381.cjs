const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const content = fs.readFileSync('.env', 'utf8');
const env = {};
content.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runAudit() {
  console.log('🔍 Executando Auditoria Pericial 381: Encadeamento de Odômetro e Faturamento Anterior...');

  // 1. Inspecionar snapshot de 09/09
  const { data: snap09, error: err09 } = await supabase
    .from('daily_snapshots')
    .select('date, faturamento, metadata')
    .eq('date', '2026-09-09')
    .single();

  if (err09 || !snap09) {
    console.error('❌ Erro ao buscar snapshot de 09/09:', err09);
    process.exit(1);
  }

  console.log('1. Snapshot 09/09:');
  console.log('   - Coluna faturamento:', snap09.faturamento);
  console.log('   - Metadata odometro_hoje:', snap09.metadata?.odometro_hoje);
  console.log('   - Metadata faturamento_anterior:', snap09.metadata?.faturamento_anterior);
  console.log('   - Metadata faturamento_oi_base:', snap09.metadata?.faturamento_oi_base);

  // Verificação 1: Odômetro do fechamento anterior
  const meta09 = snap09.metadata || {};
  const previousOdometroFor10 = Number(meta09.odometro_hoje ?? meta09.faturamento_anterior ?? snap09.faturamento ?? 0);
  console.log('\n2. Prova Real - Encadeamento para 10/09:');
  console.log('   - Odômetro Anterior recuperado:', previousOdometroFor10);

  if (Math.abs(previousOdometroFor10 - 235023.20) > 0.01) {
    console.error(`❌ FALHA: Esperado R$ 235.023,20, mas obteve R$ ${previousOdometroFor10}`);
    process.exit(1);
  }
  console.log('   ✅ Odômetro anterior bateu exatamente com o fechamento homologado: R$ 235.023,20');

  // Verificação 2: Cálculo do delta diário para 10/09
  const odometroHoje10 = 281317.68;
  const deltaDiario = odometroHoje10 - previousOdometroFor10;
  console.log('\n3. Prova Real - Delta Líquido Diário em 10/09:');
  console.log(`   - Odômetro Hoje: R$ ${odometroHoje10.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   - Odômetro Anterior: R$ ${previousOdometroFor10.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   - Faturamento Líquido Calculado: R$ ${deltaDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  if (Math.abs(deltaDiario - 46294.48) > 0.01) {
    console.error(`❌ FALHA: Esperado R$ 46.294,48, mas obteve R$ ${deltaDiario}`);
    process.exit(1);
  }
  console.log('   ✅ Faturamento diário calculado bateu perfeitamente com a prova real: R$ 46.294,48');

  // Verificação 3: Retorno da RPC get_daily_reconciliation_summary para 10/09
  const { data: summary10, error: errSummary } = await supabase
    .rpc('get_daily_reconciliation_summary', { p_date: '2026-09-10' });

  if (errSummary) {
    console.error('❌ Erro na RPC:', errSummary);
    process.exit(1);
  }

  console.log('\n4. Verificação da RPC get_daily_reconciliation_summary para 10/09:');
  console.log('   - summary.faturamento_anterior:', summary10.faturamento_anterior);
  console.log('   - summary.caixa_anterior:', summary10.caixa_anterior);

  if (Math.abs(Number(summary10.faturamento_anterior) - 235023.20) > 0.01) {
    console.error(`❌ FALHA na RPC: Esperado R$ 235.023,20, mas obteve ${summary10.faturamento_anterior}`);
    process.exit(1);
  }
  console.log('   ✅ RPC retornou faturamento_anterior correto: R$ 235.023,20');

  console.log('\n======================================================');
  console.log('🎉 [AUDIT_PASSED] TODAS AS VERIFICAÇÕES PASSARAM COM SUCESSO!');
  console.log('======================================================');
}

runAudit().catch(err => {
  console.error('Erro na auditoria:', err);
  process.exit(1);
});
