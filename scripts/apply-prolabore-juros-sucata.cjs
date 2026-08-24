const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyAdjustments() {
  console.log('=== 1. LANÇANDO PRÓ-LABORE DANIEL R$ 10.070,00 (SANTO ANDRÉ) ===');
  // Check if already exists to avoid duplicates
  const { data: existingDaniel } = await s.from('daily_manual_bills')
    .select('id')
    .eq('date', '2026-08-24')
    .ilike('title', '%DANIEL%');

  if (!existingDaniel || existingDaniel.length === 0) {
    const { error: dErr } = await s.from('daily_manual_bills').insert({
      date: '2026-08-24',
      store_id: 'st-08',
      title: 'PROLABORE DANIEL',
      description: 'Pró-labore Daniel (Santo André) - Fechamento 24/08',
      category: 'outros',
      amount: 10070.00
    });
    if (dErr) console.error('Erro ao inserir prolabore Daniel:', dErr);
    else console.log('✅ Pró-labore Daniel R$ 10.070,00 lançado com sucesso!');
  } else {
    console.log('ℹ️ Pró-labore Daniel já estava cadastrado.');
  }

  console.log('\n=== 2. AJUSTANDO JUROS REDE PARA R$ 5.650,15 NO SNAPSHOT ===');
  const { error: jErr } = await s.from('daily_snapshots')
    .update({ juros_rede: 5650.15 })
    .eq('date', '2026-08-24');
  if (jErr) console.error('Erro ao atualizar juros rede:', jErr);
  else console.log('✅ Juros Rede fixado em R$ 5.650,15!');

  console.log('\n=== 3. LANÇANDO AJUSTES DE SUCATA R$ 90,00 (R$ 60 HD + R$ 30 JB) ===');
  const { data: existingSucata } = await s.from('daily_revenue_adjustments')
    .select('id')
    .eq('date', '2026-08-24');

  if (!existingSucata || existingSucata.length === 0) {
    await s.from('daily_revenue_adjustments').insert([
      { date: '2026-08-24', title: 'SUCATA HD', description: 'Venda de Sucata Santo André HD', amount: 60.00, type: 'sucata' },
      { date: '2026-08-24', title: 'SUCATA JB', description: 'Venda de Sucata Jorge Beretta', amount: 30.00, type: 'sucata' }
    ]);
    console.log('✅ Sucata HD (R$ 60) e Sucata JB (R$ 30) lançadas!');
  } else {
    console.log('ℹ️ Ajustes de faturamento já existiam.');
  }

  console.log('\n=== 4. AUDITORIA FINAL VIA RPC DA CONCILIAÇÃO ===');
  const { data: rpc, error: rpcErr } = await s.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  if (rpcErr) {
    console.error('Erro RPC:', rpcErr);
    return;
  }

  console.log('------------------------------------------------------------------');
  console.log('RESUMO FINAL COMPLETO DO FECHAMENTO:');
  console.log('------------------------------------------------------------------');
  console.log('Saldo Bancos OFX (10 contas) : R$', rpc.saldo_bancos_ofx.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('Dinheiro em Lojas (Cofre)    : R$', rpc.dinheiro_em_lojas.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('Cartões a Compensar (Rede)   : R$', rpc.cartoes_a_compensar.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('Total Saldo Banco (Pilar 1)  : R$', rpc.total_saldo_banco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('Dinheiro MP                  : R$', rpc.dinheiro_mp.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('A Receber (Boletos)          : R$', rpc.a_receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('Na Loja OS (Pátio 28 OSs)    : R$', rpc.na_loja_os.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('------------------------------------------------------------------');
  console.log('CAIXA ATUAL (Patrimônio)     : R$', rpc.caixa_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('CAIXA ANTERIOR (Fechamento)  : R$', rpc.caixa_anterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('FLUXO DE CAIXA LÍQUIDO       : R$', rpc.fluxo_caixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('------------------------------------------------------------------');
  console.log('FATURAMENTO TOTAL DO DIA     : R$', rpc.faturamento_periodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('VALOR DISPONÍVEL P/ CONTAS   : R$', rpc.valor_disp_contas.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('CONTAS A PAGAR (Total Manual): R$', rpc.contas_manual.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('JUROS REDE (Taxas Líquidas)  : R$', rpc.juros_rede.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('SUBTOTAL CONTAS A COBRIR     : R$', rpc.subtotal_contas.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('------------------------------------------------------------------');
  console.log('DIFERENÇA FINAL              : R$', rpc.diferenca_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log('STATUS GERAL DA AUDITORIA    :', rpc.status_geral.toUpperCase());
  console.log('------------------------------------------------------------------');
}
applyAdjustments();
