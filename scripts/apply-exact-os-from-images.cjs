const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const targetDate = '2026-09-03';

// Mapeamento Canônico dos 25 Prints das Imagens
const CANONICAL_IMAGE_OS = [
  // JABAQUARA (st-02)
  {
    store_id: 'st-02',
    store_name: 'Jabaquara - JAB',
    os_number: '403',
    plate: 'EQC8527',
    client_name: 'YARA CAROLINA FERNANDES DE SOUZA',
    total_value: 4488.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: 'st-02',
    store_name: 'Jabaquara - JAB',
    os_number: '401',
    plate: 'DZB3378',
    client_name: 'LUANA MARIA ESTEVES CARVALHO CAMARGO',
    total_value: 1500.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: 'st-02',
    store_name: 'Jabaquara - JAB',
    os_number: '368',
    plate: 'GOD3J08',
    client_name: 'VANESSA FAVRETTO GONCALVES',
    total_value: 211.20,
    paid_value: 211.20,
    cash_value: 211.20,
    status: 'finalizada',
    payment_method: 'Dinheiro',
    opened_at: '2026-08-31 08:00:00+00',
    closed_at: `${targetDate} 17:00:00+00`
  },

  // SANTO ANDRÉ (st-08)
  {
    store_id: 'st-08',
    store_name: 'Santo André - HD',
    os_number: '2415',
    plate: 'DUG7333',
    client_name: 'ALEXANDER BOMBONATO MOLINA',
    total_value: 4332.38,
    paid_value: 3000.00,
    pix_transfer_value: 3000.00,
    status: 'pago_parcial',
    payment_method: 'PIX / Cheque',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: 'st-08',
    store_name: 'Santo André - HD',
    os_number: '2414',
    plate: 'RUH5G22',
    client_name: 'SCARLETH SOUZA SILVA PIRES',
    total_value: 3984.80,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: 'st-08',
    store_name: 'Santo André - HD',
    os_number: '2416',
    plate: 'FZK6F47',
    client_name: 'MAURICIO DE FREITAS MORAES',
    total_value: 385.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: 'st-08',
    store_name: 'Santo André - HD',
    os_number: '2405',
    plate: 'ERB2666',
    client_name: 'ANTONIO FELICIANO OLIVEIRA FILHO',
    total_value: 2336.40,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: '2026-08-31 08:00:00+00'
  },

  // RUDGE RAMOS (st-07)
  {
    store_id: 'st-07',
    store_name: 'Rudge Ramos - CAP',
    os_number: '8769',
    plate: 'DWT8353',
    client_name: 'CRISTINA ARAKAKI',
    total_value: 4461.00,
    paid_value: 2676.60,
    credit_value: 2676.60,
    status: 'pago_parcial',
    payment_method: 'Cartão de Crédito 10x',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: 'st-07',
    store_name: 'Rudge Ramos - CAP',
    os_number: '8768',
    plate: 'FXT6149',
    client_name: 'WALISSON DOUGLAS TRISTAO SOBRAL',
    total_value: 520.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: 'st-07',
    store_name: 'Rudge Ramos - CAP',
    os_number: '8689',
    plate: 'FNE4866',
    client_name: 'LUIS FELIPE DA CASA',
    total_value: 6140.00,
    paid_value: 2000.00,
    pix_transfer_value: 2000.00,
    status: 'pago_parcial',
    payment_method: 'PIX / A Combinar',
    opened_at: '2026-08-31 08:00:00+00'
  },
  {
    store_id: 'st-07',
    store_name: 'Rudge Ramos - CAP',
    os_number: '8763',
    plate: 'QUO0F41',
    client_name: 'DOUGLAS JOSÉ MOREIRA DE SOUZA',
    total_value: 4236.40,
    paid_value: 2265.24,
    pix_transfer_value: 2265.24,
    status: 'pago_parcial',
    payment_method: 'PIX',
    opened_at: '2026-08-31 08:00:00+00'
  },
  {
    store_id: 'st-07',
    store_name: 'Rudge Ramos - CAP',
    os_number: '8762',
    plate: 'MUJ3062',
    client_name: 'JOSE ANTONIO DA SILVEIRA',
    total_value: 1585.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: '2026-08-31 08:00:00+00'
  },
  {
    store_id: 'st-07',
    store_name: 'Rudge Ramos - CAP',
    os_number: '8766',
    plate: 'DKC3J57',
    client_name: 'MARCELO MOTTOLA DOS SANTOS',
    total_value: 743.00,
    paid_value: 743.00,
    pix_transfer_value: 743.00,
    status: 'finalizada',
    payment_method: 'PIX',
    opened_at: '2026-08-31 08:00:00+00',
    closed_at: `${targetDate} 17:00:00+00`
  },

  // REI DO MÓDULO (st-09)
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '1858',
    plate: 'NWC2C82',
    client_name: 'UIRSES GABRIEL JABRA DE OLIVEIRA',
    total_value: 4140.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: '2026-08-31 08:00:00+00'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '1856',
    plate: 'FUSCANOVO',
    client_name: 'LUTUM MOTORS (FUSCA NOVO)',
    total_value: 4000.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: '2026-08-31 08:00:00+00'
  },
  {
    store_id: 'st-09',
    store_name: 'Rei do Módulo - MP',
    os_number: '1818',
    plate: 'ECGSPORT',
    client_name: 'WESLEY CORREA DE CASTRO',
    total_value: 5200.00,
    paid_value: 2400.00,
    status: 'pago_parcial',
    payment_method: 'A Combinar',
    opened_at: '2026-08-31 08:00:00+00'
  },

  // PIRAPORINHA (st-05)
  {
    store_id: 'st-05',
    store_name: 'Piraporinha - EMPORIO',
    os_number: '40342',
    plate: 'FUF2B18',
    client_name: 'YAN DE MORAES TOMAZ',
    total_value: 2045.10,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: 'st-05',
    store_name: 'Piraporinha - EMPORIO',
    os_number: '40337',
    plate: 'ENV1098',
    client_name: 'THIAGO DE FREITAS ALBINO',
    total_value: 9306.70,
    paid_value: 5300.00,
    pix_transfer_value: 5300.00,
    status: 'pago_parcial',
    payment_method: 'PIX / A Combinar',
    opened_at: '2026-08-31 08:00:00+00'
  },

  // DOM PEDRO (st-01)
  {
    store_id: 'st-01',
    store_name: 'Dom Pedro - DP',
    os_number: '601',
    plate: 'GFV3134',
    client_name: 'EDSON DA SILVA MELO',
    total_value: 2637.50,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: '2026-08-31 08:00:00+00'
  },
  {
    store_id: 'st-01',
    store_name: 'Dom Pedro - DP',
    os_number: '596',
    plate: 'FOB7313',
    client_name: 'JOSÉ APARECIDO FERREIRA',
    total_value: 3649.70,
    paid_value: 2000.00,
    debit_value: 2000.00,
    status: 'pago_parcial',
    payment_method: 'Cartão de Débito',
    opened_at: '2026-08-31 08:00:00+00'
  },

  // MAUÁ (3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f)
  {
    store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
    store_name: 'Maua - MHE',
    os_number: '22596',
    plate: 'FMR6D37',
    client_name: 'ALESSANDRA DA SILVA MELO',
    total_value: 385.00,
    paid_value: 300.00,
    debit_value: 300.00,
    status: 'pago_parcial',
    payment_method: 'Débito',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
    store_name: 'Maua - MHE',
    os_number: '22595',
    plate: 'EBX8211',
    client_name: 'ANDRE MELLO FERREIRA',
    total_value: 190.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: `${targetDate} 08:00:00+00`
  },
  {
    store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
    store_name: 'Maua - MHE',
    os_number: '22594',
    plate: 'FLY9H03',
    client_name: 'SAMUEL PROCOPIO OLIVEIRA',
    total_value: 190.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: `${targetDate} 08:00:00+00`
  },

  // JORGE BERETTA (st-03)
  {
    store_id: 'st-03',
    store_name: 'Jorge Beretta - DHJV',
    os_number: '1104',
    plate: 'EGQ2922',
    client_name: 'AIRTON CAMPANELLI',
    total_value: 385.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: `${targetDate} 08:00:00+00`
  },

  // PLANALTO (st-06)
  {
    store_id: 'st-06',
    store_name: 'Planalto - BRASICAR',
    os_number: '18461',
    plate: 'JGOR001',
    client_name: 'VÍCTOR MORAL MARTINS',
    total_value: 190.00,
    paid_value: 0.00,
    status: 'em_aberto',
    payment_method: 'A Combinar',
    opened_at: '2026-08-31 08:00:00+00'
  }
];

async function applyExactOs() {
  console.log('================================================================');
  console.log('🚗 ATUALIZANDO AS OSS COM DADOS EXTRAÍDOS DOS PRINTS');
  console.log('================================================================\n');

  // 1. Limpar OSs com IDs errados geradas pelo OCR solto
  await supabase.from('patio_os').delete().in('os_number', ['2007', '24056', '60148', '956']);

  // 2. Gravar as 25 OSs oficiais com seus status reais
  for (const os of CANONICAL_IMAGE_OS) {
    const isFin = os.status === 'finalizada';
    const isParcial = os.status === 'pago_parcial';

    const payload = {
      ...os,
      raw_status: isFin ? 'Finalizada' : (isParcial ? 'Pago Parcial' : 'Em Aberto'),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('patio_os').upsert(payload, { onConflict: 'store_id,os_number' });
    if (error) {
      console.error(`❌ Erro OS #${os.os_number}:`, error.message);
    } else {
      const saldo = os.total_value - os.paid_value;
      console.log(`✅ OS #${os.os_number.padEnd(5)} | ${os.store_name.padEnd(23)} | Total: R$ ${os.total_value.toFixed(2).padStart(8)} | Pago: R$ ${os.paid_value.toFixed(2).padStart(8)} | Pátio: R$ ${saldo.toFixed(2).padStart(8)} [${os.status.toUpperCase()}]`);
    }
  }

  // 3. Vincular PIX e Entradas OFX comprovadas:
  // 3.1 PIX Marcelo Mottola R$ 743 -> OS 8766 (Rudge Ramos / Dom Pedro)
  console.log('\n🔗 Vinculando transações comprovadas...');
  await supabase.from('ofx_transactions')
    .update({ matched_os_number: '8766', manual_category: 'PIX OS', manual_justification: 'PIX Cliente Marcelo Mottola (OS 8766)' })
    .eq('target_date', targetDate)
    .ilike('counterpart_name', '%MARCELO%MOTTOLA%');

  // 3.2 PIX Alexandre Molina R$ 2.000 + R$ 1.000 -> OS 2415 (Santo André)
  await supabase.from('ofx_transactions')
    .update({ matched_os_number: '2415', manual_category: 'PIX OS', manual_justification: 'PIX Parcial Cliente Alexandre Molina (OS 2415)' })
    .eq('target_date', targetDate)
    .ilike('counterpart_name', '%ALEXSANDER%MOLINA%');

  // 4. Recalcular Pátio por Loja
  const { data: openRows } = await supabase
    .from('patio_os')
    .select('store_id, store_name, os_number, total_value, paid_value')
    .in('status', ['em_aberto', 'pago_parcial']);

  const byStore = {};
  let totalPatio = 0;
  for (const r of openRows || []) {
    const pend = Math.max(0, (r.total_value || 0) - (r.paid_value || 0));
    if (pend > 0.05) {
      if (!byStore[r.store_name]) byStore[r.store_name] = 0;
      byStore[r.store_name] += pend;
      totalPatio += pend;
    }
  }

  console.log('\n================================================================');
  console.log('📊 NOVO PÁTIO CONSOLIDADO POR LOJA APÓS OS PRINTS:');
  console.log('================================================================');
  for (const [st, val] of Object.entries(byStore)) {
    console.log(`- ${st.padEnd(25, ' ')}: R$ ${val.toFixed(2).padStart(9, ' ')}`);
  }
  console.log('----------------------------------------------------------------');
  console.log(`🎯 TOTAL PÁTIO ATUALIZADO: R$ ${totalPatio.toFixed(2)}`);

  // 5. Atualizar na_loja_os em reconciliations
  const STORE_IDS = {
    'Dom Pedro - DP': 'st-01',
    'Jabaquara - JAB': 'st-02',
    'Jorge Beretta - DHJV': 'st-03',
    'Kennedy - MP': 'st-04',
    'Piraporinha - EMPORIO': 'st-05',
    'Planalto - BRASICAR': 'st-06',
    'Rudge Ramos - CAP': 'st-07',
    'Santo André - HD': 'st-08',
    'Rei do Módulo - MP': 'st-09',
    'Maua - MHE': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'
  };

  for (const [name, sid] of Object.entries(STORE_IDS)) {
    const storePatio = byStore[name] || 0;
    await supabase.from('reconciliations').update({ na_loja_os: storePatio }).eq('store_id', sid).eq('date', targetDate);
  }
}

applyExactOs().catch(console.error);
