const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targetDate = '2026-09-02';

// 1. Carregar cache de OCR para recuperar placas e clientes reais extraídos das imagens
const cacheFile = path.join(__dirname, 'extracted_0209_os_cache.json');
let ocrCache = {};
if (fs.existsSync(cacheFile)) {
  ocrCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
}

const osInfoMap = new Map();
for (const [file, d] of Object.entries(ocrCache)) {
  const osNum = String(d.os_number || '').replace(/[^0-9]/g, '');
  if (osNum) {
    osInfoMap.set(osNum, {
      plate: (d.plate || 'S/PLACA').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      client_name: d.client_name || 'Cliente',
      vehicle: d.vehicle || ''
    });
  }
}

// Lista oficial das OSs da planilha CONCILIAÇÃO 0209.xlsx (Sheet OS)
const OFFICIAL_OS = [
  // Planalto (st-06) - Pátio: OS 18461 (190,00)
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', os_number: '18464', total_value: 2129.60, paid_value: 2129.60, status: 'finalizada', payment_method: 'Débito / Dinheiro' },
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', os_number: '18463', total_value: 1972.50, paid_value: 1972.50, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', os_number: '18462', total_value: 3664.00, paid_value: 3664.00, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-06', store_name: 'Planalto - BRASICAR', os_number: '18461', total_value: 190.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },

  // Piraporinha (st-05) - Pátio: OS 40337 (3966,70)
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40341', total_value: 1800.00, paid_value: 1800.00, status: 'finalizada', payment_method: 'PIX' },
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40340', total_value: 850.00, paid_value: 850.00, status: 'finalizada', payment_method: 'PIX' },
  { store_id: 'st-05', store_name: 'Piraporinha - EMPORIO', os_number: '40337', total_value: 3966.70, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },

  // Mauá (3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f) - Pátio: 0
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22593', total_value: 1900.00, paid_value: 1900.00, status: 'finalizada', payment_method: 'Débito' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22592', total_value: 365.75, paid_value: 365.75, status: 'finalizada', payment_method: 'Pago' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22571', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22566', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', store_name: 'Maua - MHE', os_number: '22559', total_value: 16922.04, paid_value: 16922.04, status: 'finalizada', payment_method: 'Finalizada' },

  // Kennedy (st-04) - Pátio: 0
  { store_id: 'st-04', store_name: 'Kennedy - MP', os_number: '4416', total_value: 1933.80, paid_value: 1933.80, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-04', store_name: 'Kennedy - MP', os_number: '4418', total_value: 1933.80, paid_value: 1933.80, status: 'finalizada', payment_method: 'Crédito' },

  // Rudge Ramos (st-07) - Pátio: 8766 (790), 8762 (1585), 8689 (4140), 8659 (1200), 8763 (1971.16) = 9.686,16
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8767', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8766', total_value: 790.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8765', total_value: 1450.00, paid_value: 1450.00, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8764', total_value: 1688.24, paid_value: 1688.24, status: 'finalizada', payment_method: 'PIX' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8763', total_value: 4236.40, paid_value: 2265.24, status: 'pago_parcial', payment_method: 'PIX' }, // Restante: 1971.16
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8762', total_value: 1585.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8759', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8756', total_value: 6099.50, paid_value: 6099.50, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8689', total_value: 6140.00, paid_value: 2000.00, status: 'pago_parcial', payment_method: 'A Combinar' }, // Restante: 4140.00
  { store_id: 'st-07', store_name: 'Rudge Ramos - CAP', os_number: '8659', total_value: 1200.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },

  // Santo André (st-08) - Pátio: 2405 (2336.40)
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2412', total_value: 349.60, paid_value: 349.60, status: 'finalizada', payment_method: 'Débito' },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2409', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada' },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2405', total_value: 2336.40, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-08', store_name: 'Santo André - HD', os_number: '2402', total_value: 2302.16, paid_value: 2302.16, status: 'finalizada', payment_method: 'Crédito' },

  // Rei do Módulo (st-09) - Pátio: 1858 (4140), 1856 (4000), 1818 (2800) = 10.940,00
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1858', total_value: 4140.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1856', total_value: 4000.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1855', total_value: 900.00, paid_value: 900.00, status: 'finalizada', payment_method: 'PIX' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1847', total_value: 899.00, paid_value: 899.00, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1846', total_value: 4000.00, paid_value: 4000.00, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-09', store_name: 'Rei do Módulo - MP', os_number: '1818', total_value: 5200.00, paid_value: 2400.00, status: 'pago_parcial', payment_method: 'A Combinar' }, // Restante: 2800.00

  // Jorge Beretta (st-03) - Pátio: 0
  { store_id: 'st-03', store_name: 'Jorge Beretta - DHJV', os_number: '1103', total_value: 865.00, paid_value: 865.00, status: 'finalizada', payment_method: 'Crédito' },

  // Dom Pedro I (st-01) - Pátio: 601 (2637.50), 596 (1378.00) = 4.015,50
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '601', total_value: 2637.50, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '600', total_value: 2000.00, paid_value: 2000.00, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '599', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '598', total_value: 3180.00, paid_value: 3180.00, status: 'finalizada', payment_method: 'PIX / Crédito' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '597', total_value: 1700.00, paid_value: 1700.00, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '596', total_value: 1378.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '594', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '578', total_value: 0.00, paid_value: 0.00, status: 'finalizada', payment_method: 'Finalizada' },
  { store_id: 'st-01', store_name: 'Dom Pedro - DP', os_number: '508', total_value: 3649.70, paid_value: 3649.70, status: 'finalizada', payment_method: 'Débito' },

  // Jabaquara (st-02) - Pátio: 403 (520), 401 (1500), 368 (211.20) = 2.231,20
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '403', total_value: 520.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '402', total_value: 680.00, paid_value: 680.00, status: 'finalizada', payment_method: 'Crédito' },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '401', total_value: 1500.00, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '368', total_value: 211.20, paid_value: 0.00, status: 'em_aberto', payment_method: 'A Combinar' },
  { store_id: 'st-02', store_name: 'Jabaquara - JAB', os_number: '388', total_value: 211.20, paid_value: 211.20, status: 'finalizada', payment_method: 'Finalizada' }
];

async function updatePatioCars() {
  console.log('🚗 Higienizando e atualizando patio_os com os valores exatos da planilha CONCILIAÇÃO 0209.xlsx...');

  // 1. Fechar todas as OSs que não estão na lista oficial de pátio em aberto
  const openOsMap = new Map();
  OFFICIAL_OS.forEach(o => {
    if (o.status === 'em_aberto' || o.status === 'pago_parcial') {
      openOsMap.set(o.os_number, o);
    }
  });

  const { data: allExisting } = await supabase
    .from('patio_os')
    .select('id, os_number, store_id, total_value, paid_value, plate, client_name, status');

  for (const row of allExisting || []) {
    if (!openOsMap.has(String(row.os_number))) {
      if (row.status === 'em_aberto' || row.status === 'pago_parcial') {
        await supabase.from('patio_os').update({
          status: 'finalizada',
          paid_value: row.total_value,
          closed_at: `${targetDate} 18:00:00+00`,
          updated_at: new Date().toISOString()
        }).eq('id', row.id);
      }
    }
  }

  // 2. Gravar com dados exatos para cada uma das OSs oficiais
  const existingMap = new Map((allExisting || []).map(o => [`${o.store_id}_${o.os_number}`, o]));

  for (const os of OFFICIAL_OS) {
    const key = `${os.store_id}_${os.os_number}`;
    const prev = existingMap.get(key);
    const ocr = osInfoMap.get(os.os_number);

    const plate = prev?.plate || ocr?.plate || 'PATIO';
    const client = prev?.client_name || ocr?.client_name || 'Cliente';
    const isFin = os.status === 'finalizada';

    const payload = {
      store_id: os.store_id,
      store_name: os.store_name,
      os_number: os.os_number,
      plate: plate,
      client_name: client,
      total_value: os.total_value,
      paid_value: os.paid_value,
      status: os.status,
      raw_status: isFin ? 'Finalizada' : (os.paid_value > 0 ? 'Pago Parcial' : 'Em Aberto'),
      payment_method: os.payment_method,
      opened_at: '2026-08-31 08:00:00+00',
      closed_at: isFin ? `${targetDate} 18:00:00+00` : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('patio_os').upsert(payload, { onConflict: 'store_id,os_number' });
    if (error) console.error(`❌ Erro OS #${os.os_number}:`, error.message);
  }

  // 3. Verificar apuração final do pátio
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

  console.log('\n📊 CARROS EM PÁTIO POR FILIAL NO MARCO ZERO (02/09/2026):');
  for (const [st, val] of Object.entries(byStore)) {
    console.log(`- ${st.padEnd(25, ' ')}: R$ ${val.toFixed(2).padStart(9, ' ')}`);
  }
  console.log('------------------------------------------------------------');
  console.log(`🎯 TOTAL PÁTIO CONSOLIDADO: R$ ${totalPatio.toFixed(2)} (Meta: R$ 33.365,96)`);
}

updatePatioCars().catch(console.error);
