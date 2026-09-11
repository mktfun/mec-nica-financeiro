const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const storeMapping = {
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

async function run() {
  const wb = XLSX.readFile('C:\\Users\\User\\Downloads\\CONCILIAÇÃO 1009 Copia.xlsx');
  const osSheet = wb.Sheets['OS'];
  const rows = XLSX.utils.sheet_to_json(osSheet, { header: 1 });

  let currentStore = null;
  const excelList = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const col1 = (r[1] !== undefined && r[1] !== null) ? String(r[1]).trim() : '';
    const col2 = (r[2] !== undefined && r[2] !== null) ? String(r[2]).trim() : '';
    const col3 = (r[3] !== undefined && r[3] !== null) ? r[3] : null;
    const col4 = (r[4] !== undefined && r[4] !== null) ? r[4] : null;

    if (col1 && !col2 && col3 === null && isNaN(Number(col1)) && col1 !== 'Ordem de Serviço' && col1 !== 'OS:') {
      currentStore = col1;
      continue;
    }
    if (col1 === 'OS:') continue;
    if (!col1 && !col2 && typeof col3 === 'number') continue;

    const osNum = Number(col1);
    if (!isNaN(osNum) && osNum > 0 && currentStore) {
      const val = typeof col3 === 'number' ? col3 : parseFloat(String(col3 || '0').replace(',', '.'));
      excelList.push({
        storeExcel: currentStore,
        storeId: storeMapping[currentStore]?.id,
        storeName: storeMapping[currentStore]?.name,
        osNumber: String(osNum),
        dateRaw: col2,
        saldoExcel: Number(val.toFixed(2)),
        payments: col4 ? String(col4).trim() : ''
      });
    }
  }

  console.log('Total OSs no Excel:', excelList.length);

  const { data: allDbOs } = await s.from('patio_os').select('*');
  const dbOsMap = new Map();
  (allDbOs || []).forEach(o => {
    dbOsMap.set(o.os_number, o);
  });

  console.log('Total OSs no DB patio_os:', allDbOs?.length);

  let matchExact = 0;
  const missingInDb = [];
  const diffInDb = [];

  excelList.forEach(item => {
    const db = dbOsMap.get(item.osNumber);
    if (!db) {
      missingInDb.push(item);
    } else {
      const dbSaldo = Number(Math.max(0, (db.total_value || 0) - (db.paid_value || 0)).toFixed(2));
      if (Math.abs(dbSaldo - item.saldoExcel) <= 0.05) {
        matchExact++;
      } else {
        diffInDb.push({ item, db, dbSaldo });
      }
    }
  });

  console.log('\n=== RESULTADO DA COMPARAÇÃO ===');
  console.log('Bate exatamente:', matchExact);
  console.log('Faltando no DB (não cadastradas):', missingInDb.length);
  console.log('Com valor divergente no DB:', diffInDb.length);

  if (missingInDb.length > 0) {
    console.log('\n--- FALTANDO NO DB (' + missingInDb.length + ') ---');
    missingInDb.forEach(m => {
      console.log(`[${m.storeExcel}] OS #${m.osNumber} | Saldo Excel: R$ ${m.saldoExcel} | Data: ${m.dateRaw} | Pagto: ${m.payments}`);
    });
  }

  if (diffInDb.length > 0) {
    console.log('\n--- DIVERGENTES NO DB (' + diffInDb.length + ') ---');
    diffInDb.forEach(d => {
      console.log(`[${d.item.storeExcel}] OS #${d.item.osNumber} | Saldo Excel: R$ ${d.item.saldoExcel} vs Saldo DB: R$ ${d.dbSaldo} (Total: ${d.db.total_value}, Pago: ${d.db.paid_value}, Status: ${d.db.status})`);
    });
  }

  // Checagem reversa: OSs com saldo em aberto no DB que NÃO estão no Excel ou deveriam estar zeradas
  const excelOsMap = new Map(excelList.map(e => [e.osNumber, e]));
  const dbExtraOpen = [];
  (allDbOs || []).forEach(o => {
    const dbSaldo = Number(Math.max(0, (o.total_value || 0) - (o.paid_value || 0)).toFixed(2));
    const isClosedStatus = ['finalizada','finalizado','paga','pago','cancelada','cancelado'].includes((o.status || '').toLowerCase());
    if (dbSaldo > 0.05 && !isClosedStatus) {
      const excel = excelOsMap.get(o.os_number);
      if (!excel) {
        dbExtraOpen.push({ o, dbSaldo, reason: 'NÃO CONSTA NO EXCEL 10/09' });
      } else if (excel.saldoExcel <= 0.05) {
        dbExtraOpen.push({ o, dbSaldo, reason: `NO EXCEL ESTÁ R$ ${excel.saldoExcel}` });
      }
    }
  });

  console.log('\n--- OSs NO DB COM SALDO ABERTO MAS QUE NÃO DEVERIAM ESTAR ABERTAS (' + dbExtraOpen.length + ') ---');
  dbExtraOpen.forEach(d => {
    console.log(`[${d.o.store_name}] OS #${d.o.os_number} | Saldo DB: R$ ${d.dbSaldo} | Motivo: ${d.reason}`);
  });
}
run();

