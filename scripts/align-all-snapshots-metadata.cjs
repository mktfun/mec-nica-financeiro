const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CANONICAL_DAYS = [
  {
    date: '2026-09-01',
    caixa_atual: 416454.73,
    caixa_anterior: 295344.02,
    fluxo_caixa: 121110.71,
    saldo_bancario: 209505.78,
    saldo_negativo_itau: 0.00,
    dinheiro_mp: 24955.00,
    total_recebiveis: 8049.67,
    total_patio: 173839.28,
    faturamento_oi_base: 167124.48,
    faturamento_ajustes: 0.00,
    faturamento_periodo: 167124.48,
    contas_base: 46013.65,
    contas_manual_override: 46013.65,
    juros_rede: 0.00,
    subtotal_contas: 46013.65,
    diferenca_final: 0.12,
    notes: 'Conciliação Oficial — CONCILIAÇÃO 0109.xlsx'
  },
  {
    date: '2026-09-02',
    caixa_atual: 341123.41,
    caixa_anterior: 416454.73,
    fluxo_caixa: -75331.32,
    saldo_bancario: 288969.04,
    saldo_negativo_itau: 14216.26,
    dinheiro_mp: 24955.00,
    total_recebiveis: 8049.67,
    total_patio: 33365.96,
    faturamento_oi_base: 13698.09,
    faturamento_ajustes: 24454.96,
    faturamento_periodo: 38153.05,
    contas_base: 111705.46,
    contas_manual_override: 111705.46,
    juros_rede: 1790.05,
    subtotal_contas: 113495.51,
    diferenca_final: -11.14,
    notes: 'Marco Zero Oficial — CONCILIAÇÃO 0209.xlsx'
  },
  {
    date: '2026-09-03',
    caixa_atual: 352752.76,
    caixa_anterior: 341123.41,
    fluxo_caixa: 11629.35,
    saldo_bancario: 291469.73,
    saldo_negativo_itau: 396.08,
    dinheiro_mp: 24955.00,
    total_recebiveis: 8049.67,
    total_patio: 28674.44,
    faturamento_oi_base: 28558.70,
    faturamento_ajustes: 11100.00,
    faturamento_periodo: 39658.70,
    contas_base: 15829.93,
    contas_manual_override: 26041.13, // 15.829,93 contas + 10.000 Daniel + 211,20 Vanessa
    juros_rede: 1988.78,
    subtotal_contas: 28029.91,
    diferenca_final: -0.56,
    notes: 'Conciliação Oficial — CONCILIAÇÃO 0309.xlsx'
  },
  {
    date: '2026-09-04',
    caixa_atual: 357262.70,
    caixa_anterior: 352752.76,
    fluxo_caixa: 4509.94,
    saldo_bancario: 290994.62,
    saldo_negativo_itau: 1653.79,
    dinheiro_mp: 28160.00,
    total_recebiveis: 6929.67,
    total_patio: 32832.20,
    faturamento_oi_base: 29585.94,
    faturamento_ajustes: 5020.00, // 4900 aporte + 50 sucata + 70 sucata
    faturamento_periodo: 34605.94,
    contas_base: 28446.80,
    contas_manual_override: 28446.80, // 20.446,80 contas + 8.000 SISPAG
    juros_rede: 1649.96,
    subtotal_contas: 30096.76,
    diferenca_final: -0.76,
    notes: 'Conciliação Oficial — CONCILIAÇÃO 0409.xlsx'
  }
];

async function alignSnapshots() {
  console.log('🔄 Alinhando metadados dos snapshots de 01/09, 02/09, 03/09 e 04/09...');

  for (const day of CANONICAL_DAYS) {
    const { data: existing } = await supabase
      .from('daily_snapshots')
      .select('*')
      .eq('date', day.date)
      .single();

    const currentMeta = existing?.metadata || {};
    const updatedMeta = {
      ...currentMeta,
      caixa_anterior: day.caixa_anterior,
      caixa_atual: day.caixa_atual,
      fluxo_caixa: day.fluxo_caixa,
      saldo_bancos_positivo: day.saldo_bancario,
      saldo_negativo_itau: day.saldo_negativo_itau,
      dinheiro_mp: day.dinheiro_mp,
      a_receber: day.total_recebiveis,
      total_patio: day.total_patio,
      faturamento_oi_base: day.faturamento_oi_base,
      faturamento_ajustes: day.faturamento_ajustes,
      faturamento_periodo: day.faturamento_periodo,
      has_contas_override: true,
      contas_base: day.contas_base,
      contas_manual_override: day.contas_manual_override,
      subtotal_contas: day.subtotal_contas,
      diferenca_final: day.diferenca_final,
      status_geral: 'approved'
    };

    const payload = {
      date: day.date,
      caixa_atual: day.caixa_atual,
      faturamento: day.faturamento_periodo,
      dinheiro_mp: day.dinheiro_mp,
      total_recebiveis: day.total_recebiveis,
      a_receber_manual: day.total_recebiveis,
      total_patio: day.total_patio,
      saldo_bancario: day.saldo_bancario,
      saldo_negativo_itau: day.saldo_negativo_itau,
      contas_a_pagar: day.subtotal_contas,
      juros_rede: day.juros_rede,
      is_closed: true,
      closed_at: `${day.date} 19:00:00+00`,
      notes: day.notes,
      metadata: updatedMeta
    };

    await supabase.from('daily_snapshots').upsert(payload, { onConflict: 'date' });
    console.log(`✅ Snapshot ${day.date} alinhado com sucesso!`);
  }
}

alignSnapshots().catch(console.error);
