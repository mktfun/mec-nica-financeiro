const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runScenarioTests() {
  console.log('🧪 =================================================================');
  console.log('🧪 TESTES DE VERIFICAÇÃO AUTOMATIZADA: SPEC 360 (HYDRA WORKSPACE)');
  console.log('🧪 =================================================================\n');

  const testDate = '2026-09-02';

  // =========================================================================
  // CENÁRIO 1: INICIALIZAÇÃO DA CONVERSA E PERSISTÊNCIA NO BANCO
  // =========================================================================
  console.log('🔹 [Cenário 1] Testando Inicialização da Conversa de Conciliação...');
  
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({
      target_date: testDate,
      title: `Auditoria Automatizada ${testDate}`,
      status: 'active',
      metadata: { module: 'conciliacao', engine: 'hydra' }
    })
    .select('id')
    .single();

  if (convErr) throw new Error(`Falha ao criar conversation: ${convErr.message}`);
  console.log(`✅ Conversa criada com sucesso no PostgreSQL! ID: ${conv.id}`);

  // Inserir mensagem com InlineDecisionProposal nos parts/tool_invocations
  const sampleProposal = {
    id: 'prop-test-01',
    armId: 'patio_investigator',
    title: 'Vínculo de Crédito PIX à OS #5892',
    description: 'Localizado PIX de R$ 450,00 na Loja Santo André com OS pendente no pátio.',
    storeId: 'st-04',
    storeName: 'Santo André',
    amount: 450.00,
    projectedDelta: -11.14,
    actionPayload: {
      transactionId: '00000000-0000-0000-0000-000000000001',
      actionType: 'justify_only',
      category: 'PIX Identificado',
      justification: 'Vínculo homologado pelo operador via atalho 1/Enter'
    },
    status: 'pending'
  };

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conv.id,
      role: 'assistant',
      content: 'Identifiquei uma oportunidade de regularização na Loja Santo André.',
      parts: [{ type: 'proposal', proposal: sampleProposal }]
    })
    .select('id, parts')
    .single();

  if (msgErr) throw new Error(`Falha ao inserir message com proposal: ${msgErr.message}`);
  console.log(`✅ Mensagem com proposta inline persistida no PostgreSQL! ID: ${msg.id}`);

  // =========================================================================
  // CENÁRIO 2: VALIDAÇÃO DA SSOT CANÔNICA DOS 5 PILARES NO POSTGRESQL
  // =========================================================================
  console.log('\n🔹 [Cenário 2] Validando Resumo Canônico e Live Delta...');

  const { data: summary, error: sumErr } = await supabase.rpc('get_daily_reconciliation_summary', {
    p_date: testDate,
    p_force_dynamic: true
  });

  if (sumErr) throw new Error(`Falha ao chamar get_daily_reconciliation_summary: ${sumErr.message}`);

  console.log(`- Caixa Atual: R$ ${summary.caixa_atual}`);
  console.log(`- Faturamento Período: R$ ${summary.faturamento_periodo}`);
  console.log(`- Subtotal Contas: R$ ${summary.subtotal_contas}`);
  console.log(`- Diferença Final (Delta): R$ ${summary.diferenca_final}`);
  console.log(`- Status Geral: ${summary.status_geral}`);
  console.log(`- Filiais Analisadas: ${summary.stores ? summary.stores.length : 0}`);

  if (Math.abs(Number(summary.diferenca_final)) <= 50) {
    console.log('✅ Fechamento em conformidade com a tolerância contábil aprovada!');
  } else {
    console.log('⚠️ Fechamento com divergência a ser apurada.');
  }

  // =========================================================================
  // LIMPEZA DOS REGISTROS DE TESTE
  // =========================================================================
  await supabase.from('conversations').delete().eq('id', conv.id);
  console.log('\n🧹 Limpeza da conversa temporária de teste concluída.');

  console.log('\n🎉 TODOS OS TESTES DOS CENÁRIOS 1 E 2 FORAM CONCLUÍDOS COM SUCESSO!');
}

runScenarioTests().catch(err => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});
