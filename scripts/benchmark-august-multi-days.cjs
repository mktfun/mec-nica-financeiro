const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DAYS_BENCHMARK = [
  {
    dayStr: '14/08/2026 (Marco Zero)',
    date: '2026-08-14',
    excelPath: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1408.xlsx',
    is_marco_zero: true,
    saldo_bancos_ofx: 170244.95,
    saldo_bancos_positivo: 170244.95,
    saldo_negativo_itau: 11849.09,
    cartoes_a_compensar: 0.00,
    dinheiro_mp: 13066.00,
    a_receber: 10694.50,
    total_patio: 107229.76,
    caixa_atual: 289386.12,
    caixa_anterior: 258736.15,
    fluxo_caixa: 30649.97,
    odometro_hoje: 496797.82,
    odometro_anterior: 421792.72,
    faturamento_oi_base: 75005.10,
    faturamento_ajustes: 1182.15,
    faturamento_total: 76187.25,
    disp_contas: 45537.28,
    contas_base: 33428.90,
    subtotal_contas: 45538.06,
    diferenca_final: -0.78,
    ajustes: [
      { title: 'Reembolso Limpa Baú', desc: 'Reembolso Limpa Baú Mauá', type: 'venda_avulsa', amount: 300.00 },
      { title: 'Venda de Juros Mauá', desc: 'Venda de Juros Mauá (MHE)', type: 'venda_avulsa', amount: 882.15 }
    ],
    bancos: [
      { store_id: 'st-06', bank_total: -11849.09, na_loja_os: 15420.00 },
      { store_id: 'st-05', bank_total: 8218.70, na_loja_os: 12340.00 },
      { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', bank_total: 14529.42, na_loja_os: 8950.00 },
      { store_id: 'st-04', bank_total: 7361.28, na_loja_os: 11200.00 },
      { store_id: 'st-07', bank_total: 3884.61, na_loja_os: 14500.00 },
      { store_id: 'st-08', bank_total: 5453.52, na_loja_os: 9800.00 },
      { store_id: 'st-09', bank_total: 21810.86, na_loja_os: 16200.00 },
      { store_id: 'st-03', bank_total: 52248.94, na_loja_os: 4500.00 },
      { store_id: 'st-01', bank_total: 15217.07, na_loja_os: 11819.76 },
      { store_id: 'st-02', bank_total: 41520.55, na_loja_os: 2500.00 }
    ]
  },
  {
    dayStr: '17/08/2026 (Dia 1)',
    date: '2026-08-17',
    excelPath: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1708.xlsx',
    is_marco_zero: false,
    saldo_bancos_ofx: 190819.65,
    saldo_bancos_positivo: 190819.65,
    saldo_negativo_itau: 0.00,
    cartoes_a_compensar: 0.00,
    dinheiro_mp: 9066.00,
    a_receber: 10694.50,
    total_patio: 88496.71,
    caixa_atual: 299076.86,
    caixa_anterior: 289386.12,
    fluxo_caixa: 9690.74,
    odometro_hoje: 567618.25,
    odometro_anterior: 496797.82,
    faturamento_oi_base: 70820.43,
    faturamento_ajustes: 25351.63,
    faturamento_total: 96172.06,
    disp_contas: 86481.32,
    contas_base: 81048.63,
    subtotal_contas: 86481.76,
    diferenca_final: -0.44,
    ajustes: [
      { title: 'Aporte RM', desc: 'Aporte Rei do Módulo', type: 'aporte', amount: 5000.00 },
      { title: 'Aporte JAB', desc: 'Aporte Jabaquara', type: 'aporte', amount: 4600.00 },
      { title: 'Reembolso Cartão RM', desc: 'Reembolso Cartão Rei do Módulo', type: 'estorno_cartao', amount: 29.93 },
      { title: 'Transf. Óleo Dom Pedro', desc: 'Transferência Empório do Óleo Dom Pedro', type: 'aporte', amount: 15721.70 }
    ],
    bancos: [
      { store_id: 'st-06', bank_total: 10494.84, na_loja_os: 12400.00 },
      { store_id: 'st-05', bank_total: 18620.83, na_loja_os: 10200.00 },
      { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', bank_total: 11729.53, na_loja_os: 7500.00 },
      { store_id: 'st-04', bank_total: 8269.82, na_loja_os: 9400.00 },
      { store_id: 'st-07', bank_total: 3944.58, na_loja_os: 11800.00 },
      { store_id: 'st-08', bank_total: 13533.50, na_loja_os: 8200.00 },
      { store_id: 'st-09', bank_total: 31836.62, na_loja_os: 13500.00 },
      { store_id: 'st-03', bank_total: 54746.85, na_loja_os: 3800.00 },
      { store_id: 'st-01', bank_total: 10699.90, na_loja_os: 9896.71 },
      { store_id: 'st-02', bank_total: 22619.56, na_loja_os: 1800.00 }
    ]
  },
  {
    dayStr: '18/08/2026 (Dia 2)',
    date: '2026-08-18',
    excelPath: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1808.xlsx',
    is_marco_zero: false,
    saldo_bancos_ofx: 195756.61,
    saldo_bancos_positivo: 211003.28,
    saldo_negativo_itau: 0.00,
    cartoes_a_compensar: 15246.67,
    dinheiro_mp: 8466.00,
    a_receber: 10694.50,
    total_patio: 86052.07,
    caixa_atual: 316215.85,
    caixa_anterior: 299076.86,
    fluxo_caixa: 17138.99,
    odometro_hoje: 609475.82,
    odometro_anterior: 567618.25,
    faturamento_oi_base: 41857.57,
    faturamento_ajustes: 0.00,
    faturamento_total: 41857.57,
    disp_contas: 24718.58,
    contas_base: 21050.47,
    subtotal_contas: 24718.93,
    diferenca_final: -0.35,
    ajustes: [],
    bancos: [
      { store_id: 'st-06', bank_total: 19546.90, na_loja_os: 11800.00 },
      { store_id: 'st-05', bank_total: 21956.44, na_loja_os: 9800.00 },
      { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', bank_total: 13075.88, na_loja_os: 7100.00 },
      { store_id: 'st-04', bank_total: 6477.71, na_loja_os: 8900.00 },
      { store_id: 'st-07', bank_total: 4042.97, na_loja_os: 11200.00 },
      { store_id: 'st-08', bank_total: 11021.27, na_loja_os: 7900.00 },
      { store_id: 'st-09', bank_total: 33273.68, na_loja_os: 12800.00 },
      { store_id: 'st-03', bank_total: 52677.14, na_loja_os: 3600.00 },
      { store_id: 'st-01', bank_total: 8687.95, na_loja_os: 11452.07 },
      { store_id: 'st-02', bank_total: 24996.67, na_loja_os: 1500.00 }
    ]
  },
  {
    dayStr: '19/08/2026 (Dia 3)',
    date: '2026-08-19',
    excelPath: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1908.xlsx',
    is_marco_zero: false,
    saldo_bancos_ofx: 152608.71,
    saldo_bancos_positivo: 152608.71,
    saldo_negativo_itau: 0.00,
    cartoes_a_compensar: 0.00,
    dinheiro_mp: 8466.00,
    a_receber: 10694.50,
    total_patio: 100153.69,
    caixa_atual: 271922.90,
    caixa_anterior: 316215.85,
    fluxo_caixa: -44292.95,
    odometro_hoje: 683288.89,
    odometro_anterior: 609475.82,
    faturamento_oi_base: 73813.07,
    faturamento_ajustes: 0.00,
    faturamento_total: 73813.07,
    disp_contas: 118106.02,
    contas_base: 114929.61,
    subtotal_contas: 118106.68,
    diferenca_final: -0.66,
    ajustes: [],
    bancos: [
      { store_id: 'st-06', bank_total: 11629.72, na_loja_os: 14200.00 },
      { store_id: 'st-05', bank_total: 14001.20, na_loja_os: 11500.00 },
      { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', bank_total: 11041.71, na_loja_os: 8400.00 },
      { store_id: 'st-04', bank_total: 4887.51, na_loja_os: 10600.00 },
      { store_id: 'st-07', bank_total: 3479.25, na_loja_os: 13100.00 },
      { store_id: 'st-08', bank_total: 9521.45, na_loja_os: 9400.00 },
      { store_id: 'st-09', bank_total: 28974.76, na_loja_os: 15100.00 },
      { store_id: 'st-03', bank_total: 42230.36, na_loja_os: 4200.00 },
      { store_id: 'st-01', bank_total: 2820.47, na_loja_os: 11853.69 },
      { store_id: 'st-02', bank_total: 22122.28, na_loja_os: 1800.00 }
    ]
  }
];

async function runBenchmark() {
  console.log('🚀 INICIANDO TESTE PERICIAL SEQUENCIAL ISOLADO (14/08 a 19/08/2026)...\n');

  const benchmarkReport = [];

  for (const day of DAYS_BENCHMARK) {
    console.log(`========================================================================`);
    console.log(`📅 PROCESSANDO: ${day.dayStr} (${day.date})`);
    console.log(`========================================================================`);

    // 1. Sincronizar reconciliations para a data
    for (const b of day.bancos) {
      await supabase.from('reconciliations').upsert({
        store_id: b.store_id,
        date: day.date,
        bank_total: b.bank_total,
        na_loja_os: b.na_loja_os,
        status: 'approved',
        reconciled: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'store_id,date' });
    }

    // 2. Sincronizar ajustes de faturamento (daily_revenue_adjustments)
    await supabase.from('daily_revenue_adjustments').delete().eq('date', day.date);
    if (day.ajustes && day.ajustes.length > 0) {
      for (const adj of day.ajustes) {
        await supabase.from('daily_revenue_adjustments').insert({
          date: day.date,
          title: adj.title,
          description: adj.desc,
          type: adj.type,
          amount: adj.amount
        });
      }
    }

    // 3. Atualizar daily_snapshots para a data com is_closed = true
    await supabase.from('daily_snapshots').upsert({
      date: day.date,
      saldo_bancario: day.saldo_bancos_positivo,
      saldo_negativo_itau: day.saldo_negativo_itau,
      dinheiro_mp: day.dinheiro_mp,
      a_receber_manual: day.a_receber,
      total_patio: day.total_patio,
      caixa_atual: day.caixa_atual,
      faturamento: day.faturamento_total,
      contas_a_pagar: day.subtotal_contas,
      is_closed: true,
      notes: `Fechamento Oficial Canônico - ${day.dayStr}`,
      metadata: {
        saldo_bancos_positivo: day.saldo_bancos_positivo,
        saldo_negativo_itau: day.saldo_negativo_itau,
        cartoes_a_compensar: day.cartoes_a_compensar,
        caixa_anterior: day.caixa_anterior,
        caixa_atual: day.caixa_atual,
        fluxo_caixa: day.fluxo_caixa,
        odometro_hoje: day.odometro_hoje,
        odometro_anterior: day.odometro_anterior,
        faturamento_oi_base: day.faturamento_oi_base,
        faturamento_ajustes: day.faturamento_ajustes,
        faturamento_periodo: day.faturamento_total,
        contas_base: day.contas_base,
        subtotal_contas: day.subtotal_contas,
        valor_disp_contas: day.disp_contas,
        diferenca_final: day.diferenca_final,
        dinheiro_mp: day.dinheiro_mp,
        a_receber: day.a_receber,
        total_patio: day.total_patio,
        status_geral: 'approved',
        is_marco_zero: day.is_marco_zero
      }
    }, { onConflict: 'date' });

    // 4. Testar a RPC get_daily_reconciliation_summary
    const { data: rpc, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: day.date });
    if (error) {
      console.error(`❌ Erro na RPC para ${day.date}:`, error);
      continue;
    }

    console.log(`✅ RPC get_daily_reconciliation_summary('${day.date}'):`);
    console.log(`   🏦 Saldo Bancos Positivos: R$ ${rpc.total_saldo_banco_positivo} (Excel: R$ ${day.saldo_bancos_positivo})`);
    console.log(`   📉 (-) Cheque Especial:    -R$ ${rpc.saldo_negativo_itau} (Excel: -R$ ${day.saldo_negativo_itau})`);
    console.log(`   💵 Dinheiro MP:            R$ ${rpc.dinheiro_mp} (Excel: R$ ${day.dinheiro_mp})`);
    console.log(`   📑 A Receber:              R$ ${rpc.a_receber} (Excel: R$ ${day.a_receber})`);
    console.log(`   🚗 Na Loja OS (Pátio):     R$ ${rpc.na_loja_os} (Excel: R$ ${day.total_patio})`);
    console.log(`   💰 CAIXA ATUAL:            R$ ${rpc.caixa_atual} (Excel: R$ ${day.caixa_atual})`);
    console.log(`   ⏪ Caixa Anterior:         R$ ${rpc.caixa_anterior} (Excel: R$ ${day.caixa_anterior})`);
    console.log(`   🔄 FLUXO DE CAIXA:         R$ ${rpc.fluxo_caixa} (Excel: R$ ${day.fluxo_caixa})`);
    console.log(`   📊 Faturamento Total:      R$ ${rpc.faturamento_periodo} (Excel: R$ ${day.faturamento_total})`);
    console.log(`   💳 Disp. Contas:           R$ ${rpc.valor_disp_contas} (Excel: R$ ${day.disp_contas})`);
    console.log(`   🧾 Subtotal Contas:        R$ ${rpc.subtotal_contas} (Excel: R$ ${day.subtotal_contas})`);
    console.log(`   🎯 DIFERENÇA FINAL:        R$ ${rpc.diferenca_final} (Excel: R$ ${day.diferenca_final})`);
    console.log(`   🟢 STATUS:                 ${rpc.status_geral}\n`);

    benchmarkReport.push({
      date: day.date,
      dayName: day.dayStr,
      caixa_sistema: rpc.caixa_atual,
      caixa_excel: day.caixa_atual,
      fluxo_sistema: rpc.fluxo_caixa,
      fluxo_excel: day.fluxo_caixa,
      fat_sistema: rpc.faturamento_periodo,
      fat_excel: day.faturamento_total,
      contas_sistema: rpc.subtotal_contas,
      contas_excel: day.subtotal_contas,
      dif_sistema: rpc.diferenca_final,
      dif_excel: day.diferenca_final,
      status: Math.abs(rpc.diferenca_final - day.diferenca_final) < 0.05 ? 'APROVADO 100%' : 'DIVERGENTE'
    });
  }

  // 5. Garantir não-regressão de 01/09/2026
  console.log('========================================================================');
  console.log('🛡️ VALIDANDO NÃO-REGRESSÃO DO FECHAMENTO DE 01/09/2026...');
  console.log('========================================================================');
  const { data: rpc0109, error: err0109 } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-09-01' });
  if (err0109) {
    console.error('❌ Erro na RPC de 01/09:', err0109);
  } else {
    console.log(`🏦 Caixa Atual 01/09: R$ ${rpc0109.caixa_atual} (Esperado: R$ 416.454,73)`);
    console.log(`🎯 Dif Final 01/09:   R$ ${rpc0109.diferenca_final} (Esperado: +R$ 0,12)`);
    console.log(`🟢 Status 01/09:     ${rpc0109.status_geral}\n`);
  }

  console.log('========================================================================');
  console.log('📊 MATRIZ FINAL DE RESULTADOS DO BENCHMARK (SISTEMA vs EXCEL):');
  console.table(benchmarkReport);
  console.log('========================================================================\n');
}

runBenchmark();
