const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targetDate = '2026-09-02';

// Configuração canônica das 10 lojas a partir da planilha CONCILIAÇÃO 0209.xlsx (Sheet SALDO)
const STORES_CONFIG = [
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', saldo_banco: -9790.75, na_loja_os: 190.00, rede_liquido: 2112.99, contas_loja_total: 2440.00 },
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', saldo_banco: 592.77, na_loja_os: 3966.70, rede_liquido: 0.00, contas_loja_total: 17703.59 },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', saldo_banco: 4105.36, na_loja_os: 0.00, rede_liquido: 1885.18, contas_loja_total: 1400.00 },
  { store_id: 'st-04', store_name: 'Kennedy - MP', saldo_banco: 75065.88, na_loja_os: 0.00, rede_liquido: 0.00, contas_loja_total: 1050.15 },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', saldo_banco: 5573.94, na_loja_os: 9686.16, rede_liquido: 0.00, contas_loja_total: 25785.03 },
  { store_id: 'st-08', store_name: 'Santo André - HD', saldo_banco: 739.77, na_loja_os: 2336.40, rede_liquido: 346.87, contas_loja_total: 1770.40 },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', saldo_banco: -2326.50, na_loja_os: 10940.00, rede_liquido: 0.00, contas_loja_total: 10807.62 },
  { store_id: 'st-03', store_name: 'Jorge Beretta - DHJV', saldo_banco: 161693.23, na_loja_os: 0.00, rede_liquido: 796.32, contas_loja_total: 7320.93 },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', saldo_banco: 19941.24, na_loja_os: 4015.50, rede_liquido: 1984.40, contas_loja_total: 8123.00 },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', saldo_banco: -2099.01, na_loja_os: 2231.20, rede_liquido: 636.62, contas_loja_total: 13600.00 }
];

async function insertMarcoZero() {
  console.log('🏛️ Gravando Marco Zero Oficial 02/09/2026 no Supabase...');

  // 1. Atualizar Reconciliations das 10 lojas
  for (const s of STORES_CONFIG) {
    await supabase.from('reconciliations').upsert({
      store_id: s.store_id,
      date: targetDate,
      bank_total: s.saldo_banco,
      na_loja_os: s.na_loja_os,
      status: 'approved',
      divergence: 0,
      ofx_imported: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'store_id,date' });
  }
  console.log('✅ Reconciliations das 10 lojas atualizadas!');

  // 2. Montar metadata das 10 lojas
  const storesDetail = STORES_CONFIG.map(s => ({
    store_id: s.store_id,
    store_name: s.store_name,
    saldo_banco: s.saldo_banco,
    saldo_total: s.saldo_banco,
    cofre_total: 0,
    na_loja_os: s.na_loja_os,
    rede_bruto: s.rede_liquido,
    rede_liquido: s.rede_liquido,
    rede_taxas: 0,
    rede_devolucoes: 0,
    ofx_entradas_total: s.saldo_banco > 0 ? s.saldo_banco : 0,
    ofx_saidas_total: 0,
    contas_loja_total: s.contas_loja_total,
    previsto_total: s.rede_liquido,
    realizado_total: s.rede_liquido,
    diferenca_total: 0,
    rede_status: 'conciliado',
    status: 'approved'
  }));

  const snapshotPayload = {
    date: targetDate,
    caixa_atual: 341123.41,
    faturamento: 38153.05,
    dinheiro_mp: 24955.00,
    total_recebiveis: 8049.67,
    a_receber_manual: 8049.67,
    total_patio: 33365.96,
    saldo_bancario: 288969.04,
    saldo_negativo_itau: 14216.26,
    contas_a_pagar: 111705.46,
    juros_rede: 1790.05,
    is_closed: true,
    closed_at: new Date().toISOString(),
    notes: 'Marco Zero Oficial — Planilha CONCILIAÇÃO 0209.xlsx',
    metadata: {
      caixa_anterior: 416454.73,
      caixa_atual: 341123.41,
      fluxo_caixa: -75331.32,
      saldo_bancos_positivo: 288969.04,
      saldo_negativo_itau: 14216.26,
      dinheiro_mp: 24955.00,
      a_receber: 8049.67,
      total_patio: 33365.96,
      faturamento_oi_base: 13698.09,
      faturamento_ajustes: 24454.96,
      faturamento_periodo: 38153.05,
      valor_disp_contas: 113484.37,
      contas_base: 111705.46,
      subtotal_contas: 113495.51,
      diferenca_final: -11.14,
      status_geral: 'approved',
      stores: storesDetail
    }
  };

  const { data: inserted, error: snapErr } = await supabase
    .from('daily_snapshots')
    .upsert(snapshotPayload, { onConflict: 'date' })
    .select();

  if (snapErr) {
    console.error('❌ Erro ao salvar daily_snapshots:', snapErr);
  } else {
    console.log('🎉 Snapshot gravado com sucesso no daily_snapshots!');
    console.log(inserted);
  }

  // 3. Teste da RPC get_daily_reconciliation_summary
  const { data: summary, error: rpcErr } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: targetDate });
  if (rpcErr) {
    console.error('❌ Erro na RPC:', rpcErr);
  } else {
    console.log('\n================================================================');
    console.log('📊 MARCO ZERO 02/09/2026 APURADO VIA RPC COM SUCESSO:');
    console.log('================================================================');
    console.log('💰 Caixa Atual:    R$', Number(summary.caixa_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('🔙 Caixa Anterior: R$', Number(summary.caixa_anterior).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('📈 Fluxo de Caixa: R$', Number(summary.fluxo_caixa).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('🏛️ Bancos (+):     R$', Number(summary.total_saldo_banco_positivo).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('🏦 (-) Itaú Neg:   R$', Number(summary.saldo_negativo_itau).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('💵 Dinheiro MP:    R$', Number(summary.dinheiro_mp).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('📄 A Receber:      R$', Number(summary.a_receber).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('🚗 Pátio OS:       R$', Number(summary.na_loja_os).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('📊 Faturamento:    R$', Number(summary.faturamento_periodo).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('🧾 Subtotal Contas:R$', Number(summary.subtotal_contas).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('⚖️ Diferença Final:R$', Number(summary.diferenca_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    console.log('🎯 Status Geral:   ', summary.status_geral.toUpperCase());
    console.log('================================================================');
  }
}

insertMarcoZero().catch(console.error);
