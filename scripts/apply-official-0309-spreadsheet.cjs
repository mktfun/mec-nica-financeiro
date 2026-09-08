const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const targetDate = '2026-09-03';

// 1. DADOS OFICIAIS DOS 5 PILARES E DRE DA PLANILHA CONCILIAÇÃO 0309.xlsx
const OFFICIAL_PILLARS = {
  date: targetDate,
  saldo_bancario: 291469.73,        // Célula G3 (Soma dos saldos positivos + R$ 200 não entrou da OS 8757)
  saldo_negativo_itau: 396.08,      // Célula G8 (Cheque Especial Itaú - Jabaquara)
  dinheiro_mp: 24955.00,            // Célula G4 (Dinheiro MP / Cofre)
  total_recebiveis: 8049.67,        // Célula G5 (A Receber Operacional: Gestauto R$ 1.120 + Orion Mauá R$ 6.929,67)
  total_patio: 28674.44,            // Célula G6 (Na Loja OS - 10 filiais)
  soma_ativos: 353148.84,           // Célula G7 (291469.73 + 24955 + 8049.67 + 28674.44)
  caixa_atual: 352752.76,           // Célula G11 (353148.84 - 396.08)
  caixa_anterior: 341123.41,        // Célula G12 (Caixa Atual de 02/09 homologado)
  fluxo_caixa: 11629.35,            // Célula G13 (352752.76 - 341123.41)
  faturamento_bruto: 28558.70,      // Célula G16 (Faturamento ODÔMETRO)
  custo_master: 6000.00,            // Célula G17 (Custo Master)
  aporte_jabaquara: 5100.00,        // Célula G18 (Aporte Jabaquara)
  faturamento_total: 39658.70,      // Célula G19 (28558.70 + 6000 + 5100)
  disponivel_contas: 28029.35,      // Célula G21 (39658.70 - 11629.35)
  contas_a_pagar: 28029.91,         // Célula G22 (Contas R$ 15.829,93 + Juros R$ 1.988,78 + Prolabore Daniel R$ 10.000 + Vanessa R$ 211,20)
  diferenca_final: -0.56,           // Célula G23 (28029.35 - 28029.91 -> APROVADO COM -R$ 0,56)
  status: 'approved'
};

// 2. PÁTIO CONSOLIDADO POR LOJA DA SHEET OS E SHEET SALDO
const STORE_CONFIG = [
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', na_loja_os: 190.00, saldo_banco: 501.21, rede_liquido: 5198.75, contas_loja_total: 10400.00 },
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', na_loja_os: 6051.80, saldo_banco: 4525.82, rede_liquido: 4351.83, contas_loja_total: 413.96 },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', na_loja_os: 380.00, saldo_banco: 3262.96, rede_liquido: 382.00, contas_loja_total: 607.50 },
  { store_id: 'st-04', store_name: 'Kennedy - MP', na_loja_os: 0.00, saldo_banco: 71441.09, rede_liquido: 1879.07, contas_loja_total: 413.96 },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', na_loja_os: 10000.56, saldo_banco: 4556.92, rede_liquido: 6143.81, contas_loja_total: 7595.31 },
  { store_id: 'st-08', store_name: 'Santo André - HD', na_loja_os: 1717.38, saldo_banco: 14513.16, rede_liquido: 6935.23, contas_loja_total: 878.82 },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', na_loja_os: 6800.00, saldo_banco: 5541.18, rede_liquido: 8149.15, contas_loja_total: 5281.47 },
  { store_id: 'st-03', store_name: 'Jorge Beretta - DHJV', na_loja_os: 385.00, saldo_banco: 161083.96, rede_liquido: 0.00, contas_loja_total: 1220.00 },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', na_loja_os: 1649.70, saldo_banco: 25843.43, rede_liquido: 6090.65, contas_loja_total: 7303.43 },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', na_loja_os: 1500.00, saldo_banco: -396.08, rede_liquido: 4201.67, contas_loja_total: 870.00 }
];

// 3. LISTAGEM COMPLETA DAS OSS DA SHEET OS
const OFFICIAL_OS_LIST = [
  // Planalto (st-06) - Pátio: 190.00
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', os_number: '18461', total_value: 190.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'JGOR001', client_name: 'VÍCTOR MORAL MARTINS' },

  // Piraporinha (st-05) - Pátio: 6.051,80
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40344', total_value: 1230.00, paid_value: 1230.00, status: 'finalizada', payment_method: 'Crédito', plate: 'FUF2B18', client_name: 'Cliente' },
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40343', total_value: 3498.60, paid_value: 3498.60, status: 'finalizada', payment_method: 'Crédito', plate: 'FUF2B18', client_name: 'Cliente' },
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40342', total_value: 2045.10, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'FUF2B18', client_name: 'YAN DE MORAES TOMAZ' },
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40337', total_value: 9306.70, paid_value: 5300.00, status: 'pago_parcial', payment_method: 'PIX / Aberto', plate: 'ENV1098', client_name: 'THIAGO DE FREITAS ALBINO' },

  // Mauá (3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f) - Pátio: 380.00
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22596', total_value: 385.00, paid_value: 385.00, status: 'finalizada', payment_method: 'Débito', plate: 'FMR6D37', client_name: 'ALESSANDRA DA SILVA MELO' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22595', total_value: 190.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'EBX8211', client_name: 'ANDRE MELLO FERREIRA' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22594', total_value: 190.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'FLY9H03', client_name: 'SAMUEL PROCOPIO OLIVEIRA' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22571', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada', plate: 'PATIO', client_name: 'Cliente' },

  // Kennedy (st-04) - Pátio: 0.00
  // Sem OSs em aberto

  // Rudge Ramos (st-07) - Pátio: 10.000,56
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8769', total_value: 4461.00, paid_value: 2676.60, status: 'pago_parcial', payment_method: 'Crédito 10x', plate: 'DWT8353', client_name: 'CRISTINA ARAKAKI' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8768', total_value: 520.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'FXT6149', client_name: 'WALISSON DOUGLAS TRISTAO SOBRAL' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8766', total_value: 743.00, paid_value: 743.00, status: 'finalizada', payment_method: 'PIX', plate: 'DKC3J57', client_name: 'MARCELO MOTTOLA DOS SANTOS' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8763', total_value: 4236.40, paid_value: 2265.24, status: 'pago_parcial', payment_method: 'PIX', plate: 'QUO0F41', client_name: 'DOUGLAS JOSÉ MOREIRA DE SOUZA' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8762', total_value: 1585.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'MUJ3062', client_name: 'JOSE ANTONIO DA SILVEIRA' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8759', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada', plate: 'PATIO', client_name: 'Cliente' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8689', total_value: 6140.00, paid_value: 2000.00, status: 'pago_parcial', payment_method: 'PIX', plate: 'FNE4866', client_name: 'LUIS FELIPE DA CASA' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8659', total_value: 1200.00, paid_value: 1200.00, status: 'finalizada', payment_method: 'Finalizada', plate: 'PATIO', client_name: 'Cliente' },

  // Santo André (st-08) - Pátio: 1.717,38
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2416', total_value: 385.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'FZK6F47', client_name: 'MAURICIO DE FREITAS MORAES' },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2415', total_value: 4332.38, paid_value: 3000.00, status: 'pago_parcial', payment_method: 'PIX / Cheque', plate: 'DUG7333', client_name: 'ALEXANDER BOMBONATO MOLINA' },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2414', total_value: 3984.80, paid_value: 3984.80, status: 'finalizada', payment_method: 'Crédito', plate: 'RUH5G22', client_name: 'SCARLETH SOUZA SILVA PIRES' },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2413', total_value: 2835.51, paid_value: 2835.51, status: 'finalizada', payment_method: 'Crédito / PIX', plate: 'PATIO', client_name: 'Cliente' },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2405', total_value: 3200.00, paid_value: 3200.00, status: 'finalizada', payment_method: 'Crédito / PIX', plate: 'ERB2666', client_name: 'ANTONIO FELICIANO OLIVEIRA FILHO' },

  // Rei do Módulo (st-09) - Pátio: 6.800,00
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1858', total_value: 4040.00, paid_value: 4040.00, status: 'finalizada', payment_method: 'Crédito', plate: 'NWC2C82', client_name: 'UIRSES GABRIEL JABRA DE OLIVEIRA' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1856', total_value: 4000.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'FUSCANOVO', client_name: 'LUTUM MOTORS' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1855', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada', plate: 'PATIO', client_name: 'Cliente' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1818', total_value: 5200.00, paid_value: 2400.00, status: 'pago_parcial', payment_method: 'A Combinar', plate: 'ECGSPORT', client_name: 'WESLEY CORREA DE CASTRO' },

  // Jorge Beretta (st-03) - Pátio: 385.00
  { store_id: 'st-03', store_name: 'Jorge Beretta - DHJV', os_number: '1104', total_value: 385.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'EGQ2922', client_name: 'AIRTON CAMPANELLI' },

  // Dom Pedro I (st-01) - Pátio: 1.649,70
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '602', total_value: 320.00, paid_value: 320.00, status: 'finalizada', payment_method: 'Débito', plate: 'PATIO', client_name: 'Cliente' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '601', total_value: 2637.50, paid_value: 2637.50, status: 'finalizada', payment_method: 'Crédito', plate: 'GFV3134', client_name: 'EDSON DA SILVA MELO' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '596', total_value: 3649.70, paid_value: 2000.00, status: 'pago_parcial', payment_method: 'Débito', plate: 'FOB7313', client_name: 'JOSÉ APARECIDO FERREIRA' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '578', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada', plate: 'PATIO', client_name: 'Cliente' },

  // Jabaquara (st-02) - Pátio: 1.500,00
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '404', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada', plate: 'PATIO', client_name: 'Cliente' },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '403', total_value: 4488.00, paid_value: 4488.00, status: 'finalizada', payment_method: 'Crédito', plate: 'EQC8527', client_name: 'YARA CAROLINA FERNANDES DE SOUZA' },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '401', total_value: 1500.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar', plate: 'DZB3378', client_name: 'LUANA MARIA ESTEVES CARVALHO CAMARGO' },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '368', total_value: 211.20, paid_value: 211.20, status: 'finalizada', payment_method: 'Dinheiro', plate: 'GOD3J08', client_name: 'VANESSA FAVRETTO GONCALVES' }
];

async function syncOfficialSpreadsheet() {
  console.log('================================================================');
  console.log('📌 SINCRONIZANDO CONCILIAÇÃO E PÁTIO DO DIA 03/09/2026');
  console.log('   Planilha Oficial: CONCILIAÇÃO 0309.xlsx');
  console.log('================================================================\n');

  // 1. Atualizar patio_os com as 33 OSs oficiais da planilha
  console.log('1. Atualizando Ordens de Serviço em patio_os...');
  for (const os of OFFICIAL_OS_LIST) {
    const isFin = os.status === 'finalizada';
    const isParc = os.status === 'pago_parcial';

    const payload = {
      store_id: os.store_id,
      store_name: os.store_name,
      os_number: os.os_number,
      plate: os.plate || 'PATIO',
      client_name: os.client_name || 'Cliente',
      total_value: os.total_value,
      paid_value: os.paid_value,
      status: os.status,
      raw_status: isFin ? 'Finalizada' : (isParc ? 'Pago Parcial' : 'Em Aberto'),
      payment_method: os.payment_method,
      opened_at: `${targetDate} 08:00:00+00`,
      closed_at: isFin ? `${targetDate} 18:00:00+00` : null,
      updated_at: new Date().toISOString()
    };

    await supabase.from('patio_os').upsert(payload, { onConflict: 'store_id,os_number' });
  }

  // Fechar qualquer outra OS que não esteja aberta na planilha oficial
  const openNumbers = new Set(
    OFFICIAL_OS_LIST
      .filter(o => o.status === 'em_aberto' || o.status === 'pago_parcial')
      .map(o => `${o.store_id}_${o.os_number}`)
  );

  const { data: allOpen } = await supabase
    .from('patio_os')
    .select('id, os_number, store_id, total_value, status')
    .in('status', ['em_aberto', 'pago_parcial']);

  for (const row of allOpen || []) {
    const key = `${row.store_id}_${row.os_number}`;
    if (!openNumbers.has(key)) {
      await supabase.from('patio_os').update({
        status: 'finalizada',
        paid_value: row.total_value,
        closed_at: `${targetDate} 18:00:00+00`,
        updated_at: new Date().toISOString()
      }).eq('id', row.id);
    }
  }

  // Verificar apuração do pátio
  const { data: verifiedRows } = await supabase
    .from('patio_os')
    .select('store_id, store_name, total_value, paid_value')
    .in('status', ['em_aberto', 'pago_parcial']);

  const apuradoPorLoja = {};
  let totalPatioApurado = 0;
  for (const r of verifiedRows || []) {
    const pend = Math.max(0, (r.total_value || 0) - (r.paid_value || 0));
    if (pend > 0.05) {
      if (!apuradoPorLoja[r.store_id]) apuradoPorLoja[r.store_id] = 0;
      apuradoPorLoja[r.store_id] += pend;
      totalPatioApurado += pend;
    }
  }

  console.log(`✅ Pátio total apurado no banco: R$ ${totalPatioApurado.toFixed(2)} (Meta Oficial: R$ ${OFFICIAL_PILLARS.total_patio.toFixed(2)})`);

  // 2. Atualizar reconciliations por filial
  console.log('\n2. Atualizando reconciliations por filial...');
  for (const info of STORE_CONFIG) {
    const lojaPatio = apuradoPorLoja[info.store_id] || 0;
    await supabase.from('reconciliations').upsert({
      store_id: info.store_id,
      date: targetDate,
      bank_total: info.saldo_banco,
      na_loja_os: lojaPatio,
      status: 'approved',
      divergence: 0,
      ofx_imported: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'store_id,date' });
  }

  // 3. Montar stores detail para o metadata
  const storesDetail = STORE_CONFIG.map(s => ({
    store_id: s.store_id,
    store_name: s.store_name,
    saldo_banco: s.saldo_banco,
    saldo_total: s.saldo_banco,
    cofre_total: 0,
    na_loja_os: apuradoPorLoja[s.store_id] || 0,
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

  // 4. Gravar Snapshot canônico definitivo de 03/09/2026
  console.log('\n3. Gravando snapshot canônico definitivo em daily_snapshots...');
  const snapshotPayload = {
    date: targetDate,
    caixa_atual: OFFICIAL_PILLARS.caixa_atual,
    faturamento: OFFICIAL_PILLARS.faturamento_total,
    dinheiro_mp: OFFICIAL_PILLARS.dinheiro_mp,
    total_recebiveis: OFFICIAL_PILLARS.total_recebiveis,
    a_receber_manual: OFFICIAL_PILLARS.total_recebiveis,
    total_patio: OFFICIAL_PILLARS.total_patio,
    saldo_bancario: OFFICIAL_PILLARS.saldo_bancario,
    saldo_negativo_itau: OFFICIAL_PILLARS.saldo_negativo_itau,
    contas_a_pagar: OFFICIAL_PILLARS.contas_a_pagar,
    juros_rede: 1988.78,
    is_closed: true,
    closed_at: `${targetDate} 19:00:00+00`,
    notes: 'Conciliação Oficial — Planilha CONCILIAÇÃO 0309.xlsx',
    metadata: {
      canonical_spreadsheet: 'CONCILIAÇÃO 0309.xlsx',
      caixa_anterior: OFFICIAL_PILLARS.caixa_anterior,
      caixa_atual: OFFICIAL_PILLARS.caixa_atual,
      fluxo_caixa: OFFICIAL_PILLARS.fluxo_caixa,
      saldo_bancos_positivo: OFFICIAL_PILLARS.saldo_bancario,
      saldo_negativo_itau: OFFICIAL_PILLARS.saldo_negativo_itau,
      dinheiro_mp: OFFICIAL_PILLARS.dinheiro_mp,
      a_receber: OFFICIAL_PILLARS.total_recebiveis,
      total_patio: OFFICIAL_PILLARS.total_patio,
      faturamento_odometro: OFFICIAL_PILLARS.faturamento_bruto,
      custo_master: OFFICIAL_PILLARS.custo_master,
      aporte_jabaquara: OFFICIAL_PILLARS.aporte_jabaquara,
      faturamento_periodo: OFFICIAL_PILLARS.faturamento_total,
      valor_disp_contas: OFFICIAL_PILLARS.disponivel_contas,
      contas_base: 15829.93,
      subtotal_contas: OFFICIAL_PILLARS.contas_a_pagar,
      diferenca_final: OFFICIAL_PILLARS.diferenca_final,
      status_geral: 'approved',
      stores: storesDetail
    }
  };

  const { error: snapErr } = await supabase
    .from('daily_snapshots')
    .upsert(snapshotPayload, { onConflict: 'date' });

  if (snapErr) {
    console.error('❌ Erro ao salvar daily_snapshots:', snapErr.message);
  } else {
    console.log('✅ Snapshot oficial de 03/09/2026 salvo com sucesso!');
  }

  // 5. Testar a RPC get_daily_reconciliation_summary para 03/09/2026
  console.log('\n4. Testando a RPC get_daily_reconciliation_summary...');
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: targetDate });
  if (rpcErr) {
    console.error('❌ Erro na RPC:', rpcErr.message);
  } else {
    console.log('=== RESULTADO DA RPC get_daily_reconciliation_summary (03/09/2026) ===');
    console.log(`Caixa Atual:      R$ ${rpcRes.caixa_atual}`);
    console.log(`Caixa Anterior:   R$ ${rpcRes.caixa_anterior}`);
    console.log(`Fluxo Caixa:      R$ ${rpcRes.fluxo_caixa}`);
    console.log(`Saldo Bancos (+): R$ ${rpcRes.saldo_bancario}`);
    console.log(`(-) Itaú Negativo:R$ ${rpcRes.saldo_negativo_itau}`);
    console.log(`Dinheiro MP:      R$ ${rpcRes.dinheiro_mp}`);
    console.log(`A Receber:        R$ ${rpcRes.total_recebiveis}`);
    console.log(`Pátio OS:         R$ ${rpcRes.total_patio}`);
    console.log(`Faturamento:      R$ ${rpcRes.faturamento}`);
    console.log(`Contas a Pagar:   R$ ${rpcRes.contas_a_pagar}`);
    console.log(`Diferença Final:  R$ ${rpcRes.diferenca_final} [${rpcRes.status_geral || rpcRes.status || 'APPROVED'}]`);
  }
}

syncOfficialSpreadsheet().catch(console.error);
