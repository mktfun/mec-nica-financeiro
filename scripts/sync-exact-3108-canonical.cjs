const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const STORES = {
  planalto: 'st-06',
  piraporinha: 'st-05',
  maua: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
  kennedy: 'st-04',
  rudge: 'st-07',
  santo_andre: 'st-08',
  rei_do_modulo: 'st-09',
  jorge_beretta: 'st-03',
  dom_pedro: 'st-01',
  jabaquara: 'st-02'
};

const OS_LIST_3108 = [
  // Planalto (st-06) - R$ 1.398,00
  { store_id: STORES.planalto, store_name: 'Planalto - BRASICAR', os_number: '18462', client_name: 'Cliente OS 18462', total_value: 1208.00, paid_value: 0, opened_at: '2026-08-29 10:00:00' },
  { store_id: STORES.planalto, store_name: 'Planalto - BRASICAR', os_number: '18461', client_name: 'Cliente OS 18461', total_value: 190.00, paid_value: 0, opened_at: '2026-08-29 11:00:00' },

  // Mauá (3a3dd7ce...) - R$ 8.852,64
  { store_id: STORES.maua, store_name: 'Maua - MHE', os_number: '22566', client_name: 'Cliente OS 22566', total_value: 2849.00, paid_value: 0, opened_at: '2026-08-13 09:00:00' },
  { store_id: STORES.maua, store_name: 'Maua - MHE', os_number: '22559', client_name: 'Cliente OS 22559', total_value: 6003.64, paid_value: 0, opened_at: '2026-08-08 14:00:00' },

  // Kennedy (st-04) - R$ 2.076,80
  { store_id: STORES.kennedy, store_name: 'Kennedy - MP', os_number: '4405', client_name: 'Cliente OS 4405', total_value: 2076.80, paid_value: 0, opened_at: '2026-08-18 15:00:00' },

  // Rudge Ramos (st-07) - R$ 13.278,92
  { store_id: STORES.rudge, store_name: 'Rudge Ramos - CAP', os_number: '8762', client_name: 'Cliente OS 8762', total_value: 1585.00, paid_value: 0, opened_at: '2026-08-28 10:00:00' },
  { store_id: STORES.rudge, store_name: 'Rudge Ramos - CAP', os_number: '8761', client_name: 'Cliente OS 8761', total_value: 1090.00, paid_value: 0, opened_at: '2026-08-28 11:00:00' },
  { store_id: STORES.rudge, store_name: 'Rudge Ramos - CAP', os_number: '8755', client_name: 'Cliente OS 8755', total_value: 2980.00, paid_value: 0, opened_at: '2026-08-26 14:00:00' },
  { store_id: STORES.rudge, store_name: 'Rudge Ramos - CAP', os_number: '8689', client_name: 'Cliente OS 8689', total_value: 4140.00, paid_value: 0, opened_at: '2026-07-14 09:00:00' },
  { store_id: STORES.rudge, store_name: 'Rudge Ramos - CAP', os_number: '8659', client_name: 'Cliente OS 8659', total_value: 1200.00, paid_value: 0, opened_at: '2026-06-29 16:00:00' },
  { store_id: STORES.rudge, store_name: 'Rudge Ramos - CAP', os_number: '8756', client_name: 'Cliente OS 8756', total_value: 2283.92, paid_value: 0, opened_at: '2026-08-26 15:00:00' },

  // Santo André (st-08) - R$ 4.817,06
  { store_id: STORES.santo_andre, store_name: 'Santo André - HD', os_number: '2410', client_name: 'Cliente OS 2410', total_value: 385.00, paid_value: 0, opened_at: '2026-08-29 09:00:00' },
  { store_id: STORES.santo_andre, store_name: 'Santo André - HD', os_number: '2409', client_name: 'Cliente OS 2409', total_value: 1744.90, paid_value: 0, opened_at: '2026-08-29 10:00:00' },
  { store_id: STORES.santo_andre, store_name: 'Santo André - HD', os_number: '2405', client_name: 'Cliente OS 2405', total_value: 385.00, paid_value: 0, opened_at: '2026-08-28 11:00:00' },
  { store_id: STORES.santo_andre, store_name: 'Santo André - HD', os_number: '2402', client_name: 'Cliente OS 2402', total_value: 2302.16, paid_value: 0, opened_at: '2026-08-28 14:00:00' },

  // Rei do Módulo (st-09) - R$ 12.839,00
  { store_id: STORES.rei_do_modulo, store_name: 'Rei do Módulo - MP', os_number: '1856', client_name: 'Cliente OS 1856', total_value: 4000.00, paid_value: 0, opened_at: '2026-08-29 09:00:00' },
  { store_id: STORES.rei_do_modulo, store_name: 'Rei do Módulo - MP', os_number: '1855', client_name: 'Cliente OS 1855', total_value: 900.00, paid_value: 0, opened_at: '2026-08-28 10:00:00' },
  { store_id: STORES.rei_do_modulo, store_name: 'Rei do Módulo - MP', os_number: '1847', client_name: 'Cliente OS 1847', total_value: 899.00, paid_value: 0, opened_at: '2026-08-20 11:00:00' },
  { store_id: STORES.rei_do_modulo, store_name: 'Rei do Módulo - MP', os_number: '1846', client_name: 'Cliente OS 1846', total_value: 4240.00, paid_value: 0, opened_at: '2026-08-19 14:00:00' },
  { store_id: STORES.rei_do_modulo, store_name: 'Rei do Módulo - MP', os_number: '1818', client_name: 'Cliente OS 1818', total_value: 2800.00, paid_value: 0, opened_at: '2026-08-06 16:00:00' },

  // Dom Pedro (st-01) - R$ 2.920,00
  { store_id: STORES.dom_pedro, store_name: 'Dom Pedro - DP', os_number: '598', client_name: 'Cliente OS 598', total_value: 520.00, paid_value: 0, opened_at: '2026-08-29 09:00:00' },
  { store_id: STORES.dom_pedro, store_name: 'Dom Pedro - DP', os_number: '597', client_name: 'Cliente OS 597', total_value: 1700.00, paid_value: 0, opened_at: '2026-08-29 10:00:00' },
  { store_id: STORES.dom_pedro, store_name: 'Dom Pedro - DP', os_number: '596', client_name: 'Cliente OS 596', total_value: 700.00, paid_value: 0, opened_at: '2026-08-28 11:00:00' },

  // Jabaquara (st-02) - R$ 211,20
  { store_id: STORES.jabaquara, store_name: 'Jabaquara - JAB', os_number: '368', client_name: 'Cliente OS 368', total_value: 211.20, paid_value: 0, opened_at: '2026-08-01 10:00:00' }
];

const RECON_3108 = [
  { store_id: STORES.planalto, bank_total: -6179.02, na_loja_os: 1398.00 },
  { store_id: STORES.piraporinha, bank_total: 3938.11, na_loja_os: 0.00 },
  { store_id: STORES.maua, bank_total: 7625.57, na_loja_os: 8852.64 },
  { store_id: STORES.kennedy, bank_total: -3314.01, na_loja_os: 2076.80 },
  { store_id: STORES.rudge, bank_total: 6538.16, na_loja_os: 13278.92 },
  { store_id: STORES.santo_andre, bank_total: -3695.05, na_loja_os: 4817.06 },
  { store_id: STORES.rei_do_modulo, bank_total: 8711.09, na_loja_os: 12839.00 },
  { store_id: STORES.jorge_beretta, bank_total: 172166.77, na_loja_os: 0.00 },
  { store_id: STORES.dom_pedro, bank_total: 8046.25, na_loja_os: 2920.00 },
  { store_id: STORES.jabaquara, bank_total: 12403.16, na_loja_os: 211.20 }
];

async function sync3108Canonical() {
  console.log('🚀 SINCRONIZANDO CONCILIAÇÃO CANÔNICA EXATA DE 31/08/2026 (1:1 COM EXCEL)...');

  // 1. Limpar e Inserir OSs de pátio para 31/08
  console.log('📦 1. Inserindo 24 OSs de pátio reais (Total: R$ 46.393,62)...');
  await supabase.from('patio_os').delete().eq('status', 'em_aberto').lte('opened_at', '2026-08-31 23:59:59');
  
  for (const os of OS_LIST_3108) {
    await supabase.from('patio_os').insert({
      store_id: os.store_id,
      store_name: os.store_name,
      os_number: os.os_number,
      client_name: os.client_name,
      total_value: os.total_value,
      paid_value: os.paid_value,
      status: 'em_aberto',
      opened_at: os.opened_at,
      match_status: 'UNMATCHED'
    });
  }

  // 2. Sincronizar Reconciliations para 31/08
  console.log('🏦 2. Sincronizando saldos bancários e pátio por loja em reconciliations...');
  await supabase.from('reconciliations').delete().eq('date', '2026-08-31');
  for (const r of RECON_3108) {
    await supabase.from('reconciliations').insert({
      store_id: r.store_id,
      date: '2026-08-31',
      bank_total: r.bank_total,
      na_loja_os: r.na_loja_os,
      status: 'approved'
    });
  }

  // 3. Sincronizar Justificativas de Faturamento (daily_revenue_adjustments)
  console.log('📈 3. Sincronizando Aporte Mauá (R$ 5.000,00) em daily_revenue_adjustments...');
  await supabase.from('daily_revenue_adjustments').delete().eq('date', '2026-08-31');
  await supabase.from('daily_revenue_adjustments').insert({
    date: '2026-08-31',
    title: 'Aporte Mauá',
    description: 'Aporte de Capital Mauá (MHE)',
    type: 'aporte',
    amount: 5000.00
  });

  // 4. Sincronizar Despesas e Pró-Labores (daily_manual_bills)
  console.log('🧾 4. Sincronizando Contas Base, Juros e Pró-Labores em daily_manual_bills...');
  await supabase.from('daily_manual_bills').delete().eq('date', '2026-08-31');
  
  await supabase.from('daily_manual_bills').insert([
    {
      date: '2026-08-31',
      title: 'Contas a Pagar Operacionais Base',
      category: 'Operacional',
      amount: 46848.95,
      contabilizar_no_subtotal: true,
      is_paid: true
    },
    {
      date: '2026-08-31',
      title: 'Pró-Labore Daniel',
      category: 'Pró-Labore',
      amount: 5000.00,
      contabilizar_no_subtotal: true,
      is_paid: true
    },
    {
      date: '2026-08-31',
      title: 'Dif. Participação de Lucro Joaci',
      category: 'Distribuição Lucros',
      amount: 1714.84,
      contabilizar_no_subtotal: true,
      is_paid: true
    }
  ]);

  // 5. Atualizar Snapshot Diário (daily_snapshots)
  console.log('💾 5. Gravando Snapshot Diário Canônico 31/08/2026...');
  await supabase.from('daily_snapshots').upsert({
    date: '2026-08-31',
    saldo_bancario: 231813.81,
    saldo_negativo_itau: 13188.08,
    dinheiro_mp: 22475.00,
    a_receber_manual: 8049.67,
    total_patio: 46393.62,
    caixa_atual: 295544.02,
    faturamento: 60420.95,
    contas_a_pagar: 57496.14,
    juros_rede: 3932.35,
    is_closed: true,
    notes: 'Fechamento Oficial Canônico - 31/08/2026 (CONCILIAÇÃO 3108.xlsx)',
    metadata: {
      saldo_bancos_positivo: 231813.81,
      saldo_negativo_itau: 13188.08,
      cartoes_a_compensar: 12384.70,
      caixa_anterior: 292628.15,
      caixa_atual: 295544.02,
      fluxo_caixa: 2915.87,
      odometro_hoje: 975917.59,
      odometro_anterior: 920496.64,
      faturamento_oi_base: 55420.95,
      faturamento_ajustes: 5000.00,
      faturamento_periodo: 60420.95,
      contas_base: 46848.95,
      subtotal_contas: 57496.14,
      valor_disp_contas: 57505.08,
      diferenca_final: 8.94,
      dinheiro_mp: 22475.00,
      a_receber: 8049.67,
      total_patio: 46393.62,
      status_geral: 'approved'
    }
  }, { onConflict: 'date' });

  // 6. Testar RPC
  console.log('🧪 6. Testando get_daily_reconciliation_summary para 31/08/2026...');
  const { data: rpc, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-31' });
  if (error) {
    console.error('❌ Erro RPC 31/08:', error);
    return;
  }

  console.log('\n========================================================================');
  console.log('📊 RESULTADO CONSOLIDADO DA CONCILIAÇÃO DE 31/08/2026 (SISTEMA vs EXCEL):');
  console.log('========================================================================');
  console.log(`🏦 Saldo Bancos Positivos: R$ ${rpc.total_saldo_banco_positivo} (Excel: R$ 231.813,81)`);
  console.log(`📉 (-) Cheque Especial:    -R$ ${rpc.saldo_negativo_itau} (Excel: -R$ 13.188,08)`);
  console.log(`💵 Dinheiro MP (Cofre):    R$ ${rpc.dinheiro_mp} (Excel: R$ 22.475,00)`);
  console.log(`📑 A Receber:              R$ ${rpc.a_receber} (Excel: R$ 8.049,67)`);
  console.log(`🚗 Na Loja OS (Pátio):     R$ ${rpc.na_loja_os} (Excel: R$ 46.393,62)`);
  console.log(`💰 CAIXA ATUAL:            R$ ${rpc.caixa_atual} (Excel: R$ 295.544,02)`);
  console.log(`⏪ Caixa Anterior:         R$ ${rpc.caixa_anterior} (Excel: R$ 292.628,15)`);
  console.log(`🔄 FLUXO DE CAIXA:         R$ ${rpc.fluxo_caixa} (Excel: R$ 2.915,87)`);
  console.log(`📈 Faturamento OI Base:    R$ ${rpc.faturamento_oi_base} (Excel: R$ 55.420,95)`);
  console.log(`➕ Ajustes DRE (Aporte):   R$ ${rpc.faturamento_ajustes} (Excel: R$ 5.000,00)`);
  console.log(`📊 FATURAMENTO TOTAL:      R$ ${rpc.faturamento_periodo} (Excel: R$ 60.420,95)`);
  console.log(`💳 Disp. Contas:           R$ ${rpc.valor_disp_contas} (Excel: R$ 57.505,08)`);
  console.log(`🧾 Subtotal Contas:        R$ ${rpc.subtotal_contas} (Excel: R$ 57.496,14)`);
  console.log(`🎯 DIFERENÇA FINAL:        R$ ${rpc.diferenca_final} (Excel: +R$ 8,94)`);
  console.log(`🟢 STATUS:                 ${rpc.status_geral}`);
  console.log('========================================================================\n');
}

sync3108Canonical();
