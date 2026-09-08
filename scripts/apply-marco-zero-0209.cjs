const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targetDate = '2026-09-02';

// 1. Definição das OSs Oficiais da Planilha CONCILIAÇÃO 0209.xlsx (Sheet OS)
const OFFICIAL_OS_LIST = [
  // PLANALTO (st-06) - Pátio: R$ 190,00
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', os_number: '18464', total_value: 2129.60, paid_value: 2129.60, in_patio: 0, status: 'finalizada', payment_method: 'Débito / Dinheiro', debit_value: 1129.60, cash_value: 1000.00 },
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', os_number: '18463', total_value: 1972.50, paid_value: 1972.50, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 1972.50 },
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', os_number: '18462', total_value: 3664.00, paid_value: 3664.00, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 3664.00 },
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', os_number: '18461', total_value: 190.00, paid_value: 0.00, in_patio: 190.00, status: 'em_aberto', payment_method: 'A Combinar' },

  // PIRAPORINHA (st-05) - Pátio: R$ 3.966,70
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40341', total_value: 1800.00, paid_value: 1800.00, in_patio: 0, status: 'finalizada', payment_method: 'PIX', pix_transfer_value: 1800.00 },
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40340', total_value: 850.00, paid_value: 850.00, in_patio: 0, status: 'finalizada', payment_method: 'PIX', pix_transfer_value: 850.00 },
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40337', total_value: 3966.70, paid_value: 0.00, in_patio: 3966.70, status: 'em_aberto', payment_method: 'A Combinar' },

  // MAUÁ (3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f) - Pátio: R$ 0,00
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22593', total_value: 1900.00, paid_value: 1900.00, in_patio: 0, status: 'finalizada', payment_method: 'Débito', debit_value: 1900.00 },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22592', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22571', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22566', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22559', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },

  // KENNEDY (st-04) - Pátio: R$ 0,00
  { store_id: 'st-04', store_name: 'Kennedy - MP', os_number: '4416', total_value: 1933.80, paid_value: 1933.80, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 1933.80 },

  // RUDGE RAMOS (st-07) - Pátio: R$ 9.686,16
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8767', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8766', total_value: 790.00, paid_value: 0.00, in_patio: 790.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8765', total_value: 1450.00, paid_value: 1450.00, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 1450.00 },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8764', total_value: 1688.24, paid_value: 1688.24, in_patio: 0, status: 'finalizada', payment_method: 'PIX', pix_transfer_value: 1688.24 },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8763', total_value: 1971.16, paid_value: 1971.16, in_patio: 0, status: 'finalizada', payment_method: 'PIX', pix_transfer_value: 2265.24 },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8762', total_value: 1585.00, paid_value: 0.00, in_patio: 1585.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8759', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8756', total_value: 2583.62, paid_value: 2583.62, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 2583.62 },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8689', total_value: 4140.00, paid_value: 0.00, in_patio: 4140.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8659', total_value: 1200.00, paid_value: 0.00, in_patio: 1200.00, status: 'em_aberto', payment_method: 'A Combinar' },

  // SANTO ANDRÉ (st-08) - Pátio: R$ 2.336,40
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2412', total_value: 349.60, paid_value: 349.60, in_patio: 0, status: 'finalizada', payment_method: 'Débito', debit_value: 349.60 },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2409', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2405', total_value: 2336.40, paid_value: 0.00, in_patio: 2336.40, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2402', total_value: 2302.16, paid_value: 2302.16, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 2302.16 },

  // REI DO MÓDULO (st-09) - Pátio: R$ 10.940,00
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1858', total_value: 4140.00, paid_value: 0.00, in_patio: 4140.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1856', total_value: 4000.00, paid_value: 0.00, in_patio: 4000.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1855', total_value: 900.00, paid_value: 900.00, in_patio: 0, status: 'finalizada', payment_method: 'PIX', pix_transfer_value: 900.00 },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1847', total_value: 899.00, paid_value: 899.00, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 899.00 },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1846', total_value: 4000.00, paid_value: 4000.00, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 4000.00 },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1818', total_value: 2800.00, paid_value: 0.00, in_patio: 2800.00, status: 'em_aberto', payment_method: 'A Combinar' },

  // JORGE BERETTA (st-03) - Pátio: R$ 0,00
  { store_id: 'st-03', store_name: 'Jorge Beretta - DHJV', os_number: '1103', total_value: 865.00, paid_value: 865.00, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 865.00 },

  // DOM PEDRO I (st-01) - Pátio: R$ 4.015,50
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '601', total_value: 2637.50, paid_value: 0.00, in_patio: 2637.50, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '600', total_value: 2000.00, paid_value: 2000.00, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 2000.00 },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '599', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '598', total_value: 180.00, paid_value: 180.00, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 180.00 },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '597', total_value: 1700.00, paid_value: 1700.00, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 1700.00 },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '596', total_value: 1378.00, paid_value: 0.00, in_patio: 1378.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '594', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '578', total_value: 0.00, paid_value: 0.00, in_patio: 0, status: 'finalizada', payment_method: 'Sem cobrança' },

  // JABAQUARA (st-02) - Pátio: R$ 2.231,20
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '403', total_value: 520.00, paid_value: 0.00, in_patio: 520.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '402', total_value: 680.00, paid_value: 680.00, in_patio: 0, status: 'finalizada', payment_method: 'Crédito', credit_value: 680.00 },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '401', total_value: 1500.00, paid_value: 0.00, in_patio: 1500.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '368', total_value: 211.20, paid_value: 0.00, in_patio: 211.20, status: 'em_aberto', payment_method: 'A Combinar' }
];

// 2. Valores Canônicos das Lojas na Planilha Oficial (Sheet SALDO)
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

async function applyMarcoZero() {
  console.log('================================================================');
  console.log('🏛️ APLICANDO MARCO ZERO CANÔNICO: 02/09/2026');
  console.log('   Planilha: CONCILIAÇÃO 0209.xlsx');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // PASSO 1: ATUALIZAR PATIO_OS (CARROS EM PÁTIO E QUITAÇÕES OFICIAIS)
  // ---------------------------------------------------------------------------
  console.log('🚗 PASSO 1: Atualizando patio_os com os 46 registros oficiais da planilha...');

  // 1.1 Marcar como finalizadas as OSs antigas que não constam mais em pátio no dia 02/09
  console.log('   Limpando resquícios de pátio anteriores para garantir alinhamento exato...');
  await supabase
    .from('patio_os')
    .update({
      status: 'finalizada',
      closed_at: `${targetDate} 18:00:00+00`,
      updated_at: new Date().toISOString()
    })
    .in('status', ['em_aberto', 'pago_parcial'])
    .lte('opened_at', `${targetDate} 23:59:59+00`);

  // 1.2 Inserir/Atualizar cada OS oficial do Excel
  for (const os of OFFICIAL_OS_LIST) {
    const isFin = os.status === 'finalizada';
    const { error: osErr } = await supabase.from('patio_os').upsert({
      store_id: os.store_id,
      store_name: os.store_name,
      os_number: os.os_number,
      total_value: os.total_value,
      paid_value: os.paid_value,
      status: os.status,
      raw_status: isFin ? 'Finalizada' : 'Em Aberto',
      payment_method: os.payment_method,
      credit_value: os.credit_value || 0,
      debit_value: os.debit_value || 0,
      pix_transfer_value: os.pix_transfer_value || 0,
      cash_value: os.cash_value || 0,
      opened_at: '2026-08-31 08:00:00+00',
      closed_at: isFin ? `${targetDate} 18:00:00+00` : null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'store_id,os_number' });

    if (osErr) {
      console.error(`   ❌ Erro na OS #${os.os_number} (${os.store_name}):`, osErr.message);
    }
  }

  // Verificar o total de pátio consolidado no banco
  const { data: patioCheck } = await supabase
    .from('patio_os')
    .select('store_id, total_value, paid_value')
    .in('status', ['em_aberto', 'pago_parcial']);

  const totalPatioCalculado = (patioCheck || []).reduce((s, r) => s + Math.max(0, (r.total_value || 0) - (r.paid_value || 0)), 0);
  console.log(`   ✅ Total de Pátio Apurado no Banco: R$ ${totalPatioCalculado.toFixed(2)} (Meta Oficial: R$ 33.365,96)`);

  // ---------------------------------------------------------------------------
  // PASSO 2: ATUALIZAR RECEBÍVEIS OFICIAIS (Sheet RECEBIVEIS )
  // ---------------------------------------------------------------------------
  console.log('\n📄 PASSO 2: Inserindo recebíveis oficiais (Planalto: R$ 1.120,00 | Mauá: R$ 6.929,67)...');
  await supabase.from('receivables').delete().eq('date', targetDate);

  const officialReceivables = [
    {
      store_id: 'st-06',
      store_name: 'Planalto - BRASICAR',
      description: 'PGTO EM CONTA - GESTAUTO',
      value: 1120.00,
      date: targetDate,
      due_date: '2026-09-15',
      type: 'Transferência',
      status: 'pendente'
    },
    {
      store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
      store_name: 'Maua - MHE',
      os_number: '22530',
      description: 'BOLETO ORION OS 22530 2/3',
      value: 3464.83,
      date: targetDate,
      due_date: '2026-09-22',
      type: 'Boleto',
      status: 'pendente'
    },
    {
      store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
      store_name: 'Maua - MHE',
      os_number: '22531',
      description: 'BOLETO ORION OS 22531 3/3',
      value: 3464.84,
      date: targetDate,
      due_date: '2026-10-22',
      type: 'Boleto',
      status: 'pendente'
    }
  ];

  const { error: recErr } = await supabase.from('receivables').insert(officialReceivables);
  if (recErr) console.error('   ❌ Erro ao salvar receivables:', recErr.message);
  else console.log('   ✅ Recebíveis oficiais gravados com sucesso (Total: R$ 8.049,67)!');

  // ---------------------------------------------------------------------------
  // PASSO 3: ATUALIZAR RECONCILIATIONS (10 LOJAS)
  // ---------------------------------------------------------------------------
  console.log('\n🏪 PASSO 3: Gravando fechamento de cada uma das 10 lojas em reconciliations...');
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
  console.log('   ✅ Todas as 10 filiais atualizadas!');

  // ---------------------------------------------------------------------------
  // PASSO 4: HOMOLOGAR O SNAPSHOT OFICIAL DO MARCO ZERO (daily_snapshots)
  // ---------------------------------------------------------------------------
  console.log('\n🏆 PASSO 4: Gravando Snapshot Canônico do Marco Zero 02/09/2026...');

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

  const { error: snapErr } = await supabase
    .from('daily_snapshots')
    .upsert(snapshotPayload, { onConflict: 'date' });

  if (snapErr) {
    console.error('❌ Erro ao homologar snapshot do Marco Zero:', snapErr.message);
  } else {
    console.log('🎉 Snapshot do MARCO ZERO gravado com status APPROVED!');
  }

  // ---------------------------------------------------------------------------
  // PASSO 5: TESTE FINAL DE LEITURA VIA RPC
  // ---------------------------------------------------------------------------
  console.log('\n🔍 PASSO 5: Validando via get_daily_reconciliation_summary...');
  const { data: finalSummary, error: rpcErr } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: targetDate });
  if (rpcErr) console.error('❌ Erro na RPC:', rpcErr);
  else {
    console.log('----------------------------------------------------------------');
    console.log(`💰 Caixa Atual:    R$ ${Number(finalSummary.caixa_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`🔙 Caixa Anterior: R$ ${Number(finalSummary.caixa_anterior).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`📈 Fluxo de Caixa: R$ ${Number(finalSummary.fluxo_caixa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`🚗 Pátio Total:    R$ ${Number(finalSummary.na_loja_os).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`📄 A Receber:      R$ ${Number(finalSummary.a_receber).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`🏛️ Bancos (+):     R$ ${Number(finalSummary.total_saldo_banco_positivo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`🏦 (-) Itaú Neg:   R$ ${Number(finalSummary.saldo_negativo_itau).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`💵 Dinheiro MP:    R$ ${Number(finalSummary.dinheiro_mp).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`📊 Faturamento:    R$ ${Number(finalSummary.faturamento_periodo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`🧾 Subtotal Contas:R$ ${Number(finalSummary.subtotal_contas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`⚖️ Dif. Final:     R$ ${Number(finalSummary.diferenca_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} [${finalSummary.status_geral.toUpperCase()}]`);
    console.log('----------------------------------------------------------------');
  }
}

applyMarcoZero().catch(console.error);
