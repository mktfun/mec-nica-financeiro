const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyFixes() {
  console.log('=== 1. REMOVENDO TRANSAÇÃO DUPLICADA EM POS_TRANSACTIONS (SANTO ANDRÉ R$ 2.588,37) ===');
  const { error: delErr } = await s.from('pos_transactions')
    .delete()
    .eq('id', '2f6a94db-9dff-4b66-94b2-d8cd3d117eaf');
  if (delErr) console.error('Erro ao deletar POS duplicado:', delErr);
  else console.log('✅ Duplicata de POS (R$ 2.588,37) removida com sucesso!');

  console.log('\n=== 2. ATUALIZANDO STORE_CASH_VAULT (OS #1808 REI DO MÓDULO R$ 200,00 E OS #586 DOM PEDRO R$ 1.845,00 PENDENTES) ===');
  // Update OS 1808 to pending
  const { error: v1808Err } = await s.from('store_cash_vault')
    .update({ status: 'pending', deposited_at: null })
    .eq('id', 'ab762d9d-5170-426a-a034-66e6d39572c3');
  if (v1808Err) console.error('Erro ao atualizar OS 1808 no vault:', v1808Err);
  else console.log('✅ OS #1808 (R$ 200,00 Rei do Módulo) reaberta como pendente no cofre!');

  // Ensure OS 586 is pending
  const { error: v586Err } = await s.from('store_cash_vault')
    .update({ status: 'pending', deposited_at: null })
    .eq('id', '1e19a50c-c28f-449b-ae00-e76ee5e5b660');
  if (v586Err) console.error('Erro ao atualizar OS 586 no vault:', v586Err);
  else console.log('✅ OS #586 (R$ 1.845,00 Dom Pedro) confirmada como pendente no cofre!');

  console.log('\n=== 3. REAVALIANDO TRIPLE RECONCILIATION E FECHAMENTO ===');
  const { data: triple } = await s.rpc('get_store_pos_triple_reconciliation', { p_date: '2026-08-24' });
  console.log('Total Não Entrou (Maquininhas): R$', triple.total_nao_entrou);
  console.log('Stores Santo André:', triple.stores.find(st => st.store_id === 'st-08'));

  const { data: rpc } = await s.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  console.log('\n--- RESUMO CANÔNICO DA RPC ---');
  console.log('Saldo Bancos OFX:', rpc.saldo_bancos_ofx);
  console.log('Dinheiro em Lojas (Cofre):', rpc.dinheiro_em_lojas);
  console.log('Cartões a Compensar (Maquininhas):', rpc.cartoes_a_compensar);
  console.log('Pátio OS:', rpc.na_loja_os);
  console.log('Caixa Atual:', rpc.caixa_atual);
  console.log('Fluxo Caixa:', rpc.fluxo_caixa);
  console.log('Faturamento:', rpc.faturamento_periodo);
  console.log('Valor Disp Contas:', rpc.valor_disp_contas);
  console.log('Contas Manual:', rpc.contas_manual);
  console.log('Juros Rede:', rpc.juros_rede);
  console.log('Subtotal Contas:', rpc.subtotal_contas);
  console.log('Diferenca Final:', rpc.diferenca_final);
  console.log('Status Geral:', rpc.status_geral);
}
applyFixes();
