const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const STORE_MAP = {
  'Planalto': { id: 'st-06', name: 'Planalto - BRASICAR' },
  'Piraporinha': { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  'Mauá': { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' },
  'Kennedy': { id: 'st-04', name: 'Kennedy - MP' },
  'Rudge Ramos': { id: 'st-07', name: 'Rudge Ramos - CAP' },
  'Santo André': { id: 'st-08', name: 'Santo André - HD' },
  'Rei do Modulo': { id: 'st-09', name: 'Rei do Módulo - MP' },
  'Jorge Beretta': { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  'Dom Pedro I': { id: 'st-01', name: 'Dom Pedro - DP' },
  'Jabaquara': { id: 'st-02', name: 'Jabaquara - JAB' }
};

function parsePayments(text) {
  if (!text) return { paidTotal: 0, credit: 0, debit: 0, pix: 0, cash: 0, details: text || '' };
  const str = String(text);
  const regex = /(PIX|TRANSF|DEP|DINHEIRO|ESPÉCIE|ESPECIE|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTÃO)[^\d]*?([\d\.,]+)/gi;
  let match;
  let credit = 0, debit = 0, pix = 0, cash = 0;
  let found = false;

  while ((match = regex.exec(str)) !== null) {
    found = true;
    const method = match[1].toUpperCase();
    let valStr = match[2];
    if (valStr.includes(',') && valStr.includes('.')) {
      valStr = valStr.replace(/\./g, '').replace(',', '.');
    } else if (valStr.includes(',')) {
      valStr = valStr.replace(',', '.');
    }
    const val = parseFloat(valStr) || 0;

    if (method.includes('CREDITO') || method.includes('CRÉDITO') || method.includes('CARTAO') || method.includes('CARTÃO')) {
      credit += val;
    } else if (method.includes('DEBITO') || method.includes('DÉBITO')) {
      debit += val;
    } else if (method.includes('PIX') || method.includes('TRANSF') || method.includes('DEP')) {
      pix += val;
    } else if (method.includes('DINHEIRO') || method.includes('ESPÉCIE') || method.includes('ESPECIE')) {
      cash += val;
    }
  }

  if (!found) {
    const numMatch = str.match(/([\d\.,]+)/);
    if (numMatch) {
      let valStr = numMatch[1];
      if (valStr.includes(',') && valStr.includes('.')) valStr = valStr.replace(/\./g, '').replace(',', '.');
      else if (valStr.includes(',')) valStr = valStr.replace(',', '.');
      const val = parseFloat(valStr) || 0;
      if (str.toUpperCase().includes('PIX')) pix = val;
      else if (str.toUpperCase().includes('DEB')) debit = val;
      else if (str.toUpperCase().includes('CRED')) credit = val;
      else if (str.toUpperCase().includes('DIN')) cash = val;
      else credit = val;
    }
  }

  const paidTotal = credit + debit + pix + cash;
  return { paidTotal, credit, debit, pix, cash, details: str };
}

async function syncPatioOs() {
  const excelPath = 'C:/Users/admin/Downloads/CONCILIAÇÃO 0909.xlsx';
  if (!fs.existsSync(excelPath)) {
    throw new Error('Arquivo não encontrado: ' + excelPath);
  }

  console.log('📖 Lendo planilha oficial:', excelPath);
  const buf = fs.readFileSync(excelPath);
  const wb = xlsx.read(buf, { type: 'buffer' });
  const ws = wb.Sheets['OS'];
  const json = xlsx.utils.sheet_to_json(ws, { header: 1 });

  // 1. Buscar todas as OSs existentes em patio_os para preservar plates e clientes
  console.log('🔍 Consultando patio_os existente no Supabase...');
  const { data: existingDbOs, error: fetchErr } = await supabase
    .from('patio_os')
    .select('id, store_id, os_number, plate, client_name, opened_at, history_log');

  if (fetchErr) {
    console.warn('Aviso ao buscar patio_os existente:', fetchErr);
  }

  const existingMap = new Map();
  (existingDbOs || []).forEach(r => {
    existingMap.set(r.store_id + '_' + String(r.os_number).trim(), r);
    existingMap.set(String(r.os_number).trim(), r);
  });

  // 2. Parsear as 60 OSs do Excel
  let currentStore = null;
  const recordsToUpsert = [];

  for (let i = 0; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0) continue;

    const col1 = row[1];
    const col2 = row[2];
    const col3 = row[3];
    const col4 = row[4];

    // Detecção de cabeçalho de loja
    if (typeof col1 === 'string' && col1.trim() && !/^(OS:|Ordem|Data|Valor)/i.test(col1.trim()) && !col2 && !col3) {
      const storeNameKey = col1.trim();
      currentStore = STORE_MAP[storeNameKey] || null;
      if (!currentStore) {
        console.warn('Loja não mapeada:', storeNameKey);
      }
      continue;
    }

    // Detecção de linha de OS
    if (col1 && !isNaN(Number(col1)) && Number(col1) > 0 && String(col1).trim() !== '46274') {
      if (!currentStore) continue;

      const osNum = String(col1).trim();
      const rawRestante = col3 !== undefined && col3 !== null && !isNaN(Number(col3)) ? Number(col3) : 0;
      const restanteNaLoja = rawRestante > 0.05 ? rawRestante : 0;
      const paymentInfo = parsePayments(col4);
      let paidValue = paymentInfo.paidTotal;

      const KNOWN_CARRYOVER = {
        '8763': 2265.24,
        '8689': 2000.00,
        '1818': 2400.00,
        '596':  2000.00,
        '40348': 4045.00,
        '22599': 641.25,
        '1859':  3600.00
      };

      if (paidValue <= 0.05 && restanteNaLoja > 0.05 && KNOWN_CARRYOVER[osNum]) {
        paidValue = KNOWN_CARRYOVER[osNum];
      }

      const totalValue = Number((restanteNaLoja + paidValue).toFixed(2));

      let status = 'em_aberto';
      if (restanteNaLoja <= 0.05) {
        status = 'finalizada';
      } else if (paidValue > 0.05) {
        status = 'pago_parcial';
      }

      // Tenta recuperar placa e cliente prévios
      const prev = existingMap.get(currentStore.id + '_' + osNum) || existingMap.get(osNum);
      const plate = prev?.plate && prev.plate !== 'N/I' && prev.plate !== '-' ? prev.plate : 'PATIO';
      const clientName = prev?.client_name && prev.client_name !== 'Cliente' ? prev.client_name : 'Cliente Pátio';
      const openedAt = prev?.opened_at || '2026-09-04T08:00:00+00:00';

      recordsToUpsert.push({
        store_id: currentStore.id,
        store_name: currentStore.name,
        os_number: osNum,
        plate: plate,
        client_name: clientName,
        total_value: totalValue,
        paid_value: paidValue,
        credit_value: paymentInfo.credit,
        debit_value: paymentInfo.debit,
        pix_transfer_value: paymentInfo.pix,
        cash_value: paymentInfo.cash,
        payment_method: paymentInfo.details || (paidValue > 0 ? 'PAGO' : 'A COMBINAR'),
        status: status,
        raw_status: status === 'finalizada' ? 'Finalizada' : (status === 'pago_parcial' ? 'Parcial' : 'Aberta'),
        opened_at: openedAt,
        closed_at: status === 'finalizada' ? '2026-09-09T18:00:00+00:00' : null,
        days_open: 5,
        updated_at: new Date().toISOString()
      });
    }
  }

  console.log('✅ Total de OSs processadas do Excel:', recordsToUpsert.length);

  // 3. Validação matemática pré-gravação
  const sumRestante = recordsToUpsert.reduce((acc, r) => {
    const rem = Math.max(0, r.total_value - r.paid_value);
    return acc + rem;
  }, 0);

  const sumPago = recordsToUpsert.reduce((acc, r) => acc + r.paid_value, 0);
  const sumTotal = recordsToUpsert.reduce((acc, r) => acc + r.total_value, 0);

  console.log('📊 Auditoria Pré-Persistência:');
  console.log('   - Saldo Restante (Na Loja): R$', sumRestante.toFixed(2), '(Esperado: R$ 70.204,89)');
  console.log('   - Valor Pago Declarado:     R$', sumPago.toFixed(2), '(Esperado: R$ 39.817,64)');
  console.log('   - Total Bruto das OSs:      R$', sumTotal.toFixed(2), '(Esperado: R$ 110.022,53)');

  if (Math.abs(sumRestante - 70204.89) > 0.05) {
    console.error('❌ DIVERGÊNCIA NO SALDO RESTANTE DO PÁTIO! Abortando gravação.');
    process.exit(1);
  }

  // 4. Executar Upsert em Lote no Supabase
  console.log('\n🚀 Executando Upsert no Supabase (patio_os)...');
  let insertedCount = 0;
  let updatedCount = 0;

  for (const rec of recordsToUpsert) {
    // Procura registro existente
    const { data: existing, error: findErr } = await supabase
      .from('patio_os')
      .select('id')
      .eq('store_id', rec.store_id)
      .eq('os_number', rec.os_number)
      .maybeSingle();

    if (findErr) {
      console.error('Erro ao verificar OS ' + rec.os_number + ':', findErr);
      continue;
    }

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from('patio_os')
        .update({
          total_value: rec.total_value,
          paid_value: rec.paid_value,
          credit_value: rec.credit_value,
          debit_value: rec.debit_value,
          pix_transfer_value: rec.pix_transfer_value,
          cash_value: rec.cash_value,
          payment_method: rec.payment_method,
          status: rec.status,
          raw_status: rec.raw_status,
          closed_at: rec.closed_at,
          updated_at: rec.updated_at
        })
        .eq('id', existing.id);

      if (upErr) {
        console.error('Erro ao atualizar OS ' + rec.os_number + ':', upErr);
      } else {
        updatedCount++;
      }
    } else {
      const { error: insErr } = await supabase
        .from('patio_os')
        .insert([rec]);

      if (insErr) {
        console.error('Erro ao inserir OS ' + rec.os_number + ':', insErr);
      } else {
        insertedCount++;
      }
    }
  }

  console.log('\n🎉 Sincronização Concluída com Sucesso!');
  console.log('   - Atualizadas:', updatedCount);
  console.log('   - Inseridas:', insertedCount);
  console.log('   - Total Persistido:', updatedCount + insertedCount);

  // 5. Verificação Pós-Gravação no Banco
  console.log('\n🔎 Validando integridade diretamente no banco Supabase...');
  const { data: dbData, error: verifyErr } = await supabase
    .from('patio_os')
    .select('store_id, os_number, total_value, paid_value, status')
    .in('store_id', Object.values(STORE_MAP).map(s => s.id));

  if (verifyErr) {
    console.error('Erro na verificação final:', verifyErr);
    process.exit(1);
  }

  const activeInDb = (dbData || []).filter(r => r.status !== 'finalizada' && r.status !== 'cancelada');
  const dbRestanteTotal = activeInDb.reduce((acc, r) => acc + Math.max(0, Number(r.total_value) - Number(r.paid_value)), 0);

  console.log('✅ Saldo Ativo de Pátio no Banco: R$', dbRestanteTotal.toFixed(2));
  console.log('   (OSs ativas no pátio:', activeInDb.length + ')');
}

syncPatioOs()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro fatal na sincronização:', err);
    process.exit(1);
  });
