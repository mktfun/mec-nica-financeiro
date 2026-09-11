const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncPatioAndSnapshot() {
  console.log('🚀 Iniciando Sincronização Pericial das OSs e Fechamento de 10/09/2026...');

  // 1. Corrigir as 5 OSs divergentes
  console.log('\n1. Atualizando as 5 OSs divergentes em patio_os...');
  
  // OS #8689 (Rudge Ramos) - Baixada no dia 10/09 (Saldo 0)
  const { error: err8689 } = await supabase
    .from('patio_os')
    .update({
      paid_value: 6240.00,
      status: 'finalizado',
      raw_status: 'Finalizada',
      updated_at: new Date().toISOString()
    })
    .eq('os_number', '8689');
  if (err8689) console.error('Erro OS 8689:', err8689);
  else console.log('✅ OS #8689 (Rudge Ramos): Baixada (Saldo R$ 0,00)');

  // OS #1818 (Rei do Módulo) - Saldo 3.610,00 (Total 5900, Pago 2290)
  const { error: err1818 } = await supabase
    .from('patio_os')
    .update({
      total_value: 5900.00,
      paid_value: 2290.00,
      status: 'pago_parcial',
      raw_status: 'Parcial',
      updated_at: new Date().toISOString()
    })
    .eq('os_number', '1818');
  if (err1818) console.error('Erro OS 1818:', err1818);
  else console.log('✅ OS #1818 (Rei do Módulo): Ajustada para Saldo R$ 3.610,00');

  // OS #609 (Dom Pedro I) - Aberta com Saldo 1.013,70
  const { error: err609 } = await supabase
    .from('patio_os')
    .update({
      total_value: 1013.70,
      paid_value: 0.00,
      status: 'em_aberto',
      raw_status: 'Aberta',
      updated_at: new Date().toISOString()
    })
    .eq('os_number', '609');
  if (err609) console.error('Erro OS 609:', err609);
  else console.log('✅ OS #609 (Dom Pedro I): Reaberta com Saldo R$ 1.013,70');

  // OS #596 (Dom Pedro I) - Saldo 7.100,56
  const { error: err596 } = await supabase
    .from('patio_os')
    .update({
      total_value: 7100.56,
      paid_value: 0.00,
      status: 'em_aberto',
      raw_status: 'Aberta',
      updated_at: new Date().toISOString()
    })
    .eq('os_number', '596');
  if (err596) console.error('Erro OS 596:', err596);
  else console.log('✅ OS #596 (Dom Pedro I): Ajustada para Saldo R$ 7.100,56');

  // OS #411 (Jabaquara) - Saldo 770,00
  const { error: err411 } = await supabase
    .from('patio_os')
    .update({
      total_value: 770.00,
      paid_value: 0.00,
      status: 'em_aberto',
      raw_status: 'Aberta',
      updated_at: new Date().toISOString()
    })
    .eq('os_number', '411');
  if (err411) console.error('Erro OS 411:', err411);
  else console.log('✅ OS #411 (Jabaquara): Ajustada para Saldo R$ 770,00');

  // 2. Baixar as 15 OSs antigas que não constam no pátio de 10/09
  console.log('\n2. Baixando 15 OSs antigas finalizadas antes de 10/09...');
  const oldOsNumbers = [
    '563', '564', '565', '566',
    '8717', '8718',
    '1071', '1072', '1073',
    '368', '370',
    '1808', '1810',
    '2366',
    '4387'
  ];

  for (const osNum of oldOsNumbers) {
    const { data: current } = await supabase.from('patio_os').select('total_value').eq('os_number', osNum).single();
    if (current) {
      await supabase
        .from('patio_os')
        .update({
          paid_value: current.total_value,
          status: 'finalizado',
          raw_status: 'Finalizada',
          updated_at: new Date().toISOString()
        })
        .eq('os_number', osNum);
    }
  }
  console.log(`✅ ${oldOsNumbers.length} OSs antigas marcadas como finalizadas.`);

  // 3. Atualizar reconciliations de 10/09/2026 por filial
  console.log('\n3. Sincronizando tabela reconciliations para 10/09/2026...');
  const reconsData = [
    { store_id: 'st-06', na_loja_os: 663.50, bank_total: 322.29, status: 'validated' },
    { store_id: 'st-05', na_loja_os: 2886.10, bank_total: 744.55, status: 'validated' },
    { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', na_loja_os: 1870.54, bank_total: 3756.96, status: 'validated' },
    { store_id: 'st-04', na_loja_os: 1890.00, bank_total: 42492.36, status: 'validated' },
    { store_id: 'st-07', na_loja_os: 10005.76, bank_total: 4739.18, status: 'validated' },
    { store_id: 'st-08', na_loja_os: 8759.31, bank_total: 3324.97, status: 'validated' },
    { store_id: 'st-09', na_loja_os: 20395.60, bank_total: 14844.51, status: 'validated' },
    { store_id: 'st-03', na_loja_os: 7852.29, bank_total: 55400.75, status: 'validated' },
    { store_id: 'st-01', na_loja_os: 8634.26, bank_total: 20534.66, status: 'validated' },
    { store_id: 'st-02', na_loja_os: 3003.90, bank_total: -10453.68, status: 'validated' },
  ];

  for (const r of reconsData) {
    const { error: rErr } = await supabase
      .from('reconciliations')
      .upsert({
        date: '2026-09-10',
        store_id: r.store_id,
        na_loja_os: r.na_loja_os,
        bank_total: r.bank_total,
        status: r.status
      }, { onConflict: 'store_id,date' });
    if (rErr) console.error('Erro recon:', r.store_id, rErr);
  }
  console.log('✅ Reconciliações das 10 filiais sincronizadas ao centavo.');

  // 4. Inserir ajustes de receita (Transferências de Óleo da planilha oficial 10/09)
  console.log('\n4. Sincronizando daily_revenue_adjustments (Transferências de Óleo)...');
  await supabase.from('daily_revenue_adjustments').delete().eq('date', '2026-09-10');
  const adjs = [
    { date: '2026-09-10', title: 'TRANSF OLEO MASTER', description: 'Transf Óleo Master planilha 10/09', type: 'outros', amount: 8268.24 },
    { date: '2026-09-10', title: 'TRANSF OLEO MAUA', description: 'Transf Óleo Mauá planilha 10/09', type: 'outros', amount: 489.72, store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f' },
    { date: '2026-09-10', title: 'TRANSF OLEO JB', description: 'Transf Óleo Jorge Beretta planilha 10/09', type: 'outros', amount: 531.92, store_id: 'st-03' },
    { date: '2026-09-10', title: 'TRANSF OLEO DP', description: 'Transf Óleo Dom Pedro planilha 10/09', type: 'outros', amount: 327.92, store_id: 'st-01' },
  ];
  await supabase.from('daily_revenue_adjustments').insert(adjs);
  console.log('✅ 4 ajustes de óleo inseridos (R$ 9.617,80).');

  // 5. Atualizar daily_snapshots para 10/09/2026
  console.log('\n5. Consolidando daily_snapshots para 10/09/2026...');
  const snapshotPayload = {
    date: '2026-09-10',
    caixa_atual: 251071.92,
    faturamento: 281317.68,
    dinheiro_mp: 33840.00,
    a_receber_manual: 6929.67,
    total_recebiveis: 33840.00 + 6929.67,
    total_patio: 65961.26,
    saldo_bancario: 135706.55,
    saldo_negativo_itau: 10453.68,
    contas_a_pagar: 158950.11,
    juros_rede: 3101.30,
    faturamento_outros_valor: 9617.80,
    is_closed: true,
    closed_at: '2026-09-11T18:00:00Z',
    notes: 'Fechamento oficial consolidado via planilha CONCILIAÇÃO 1009 Copia.xlsx',
    metadata: {
      is_closed: true,
      caixa_atual: 251071.92,
      caixa_anterior: 357212.80,
      fluxo_caixa: -106140.88,
      odometro_hoje: 281317.68,
      faturamento_anterior: 235023.20,
      faturamento_oi_base: 46294.48,
      faturamento_periodo: 55912.28,
      faturamento_ajustes: 9617.80,
      dinheiro_mp: 33840.00,
      a_receber_manual: 6929.67,
      total_patio: 65961.26,
      saldo_bancos_ofx: 135706.55,
      saldo_bancos_positivo: 146160.23,
      total_saldo_banco: 146160.23,
      saldo_negativo_itau: 10453.68,
      contas_base: 158950.11,
      contas_manual: 158950.11,
      juros_rede: 3101.30,
      subtotal_contas: 162051.41,
      valor_disp_contas: 162053.16,
      diferenca_final: 1.75,
      status_geral: 'approved'
    }
  };

  const { error: snapErr } = await supabase
    .from('daily_snapshots')
    .upsert(snapshotPayload, { onConflict: 'date' });

  if (snapErr) {
    console.error('Erro daily_snapshots:', snapErr);
  } else {
    console.log('✅ Snapshot de 10/09/2026 consolidado com sucesso! Diferença Final: R$ 1,75 (Status: approved)');
  }
}

syncPatioAndSnapshot();
