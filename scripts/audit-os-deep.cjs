const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const manualPath = 'C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 2408 (1).xlsx';
  const manualWb = xlsx.readFile(manualPath);
  
  console.log('=== AUDITORIA PROFUNDA DA ABA OS DO EXCEL MANUAL ===');
  const osSheet = manualWb.Sheets['OS'];
  const osRows = xlsx.utils.sheet_to_json(osSheet, { header: 1 });

  let currentStore = null;
  const manualOSList = []; // { store, os, date, value, payments, rowIdx }
  
  for (let i = 0; i < osRows.length; i++) {
    const row = osRows[i];
    if (!row || row.length === 0) continue;
    
    const cell1 = String(row[1] || '').trim();
    if (cell1 && cell1 !== 'Ordem de Serviço' && isNaN(Number(cell1)) && !cell1.startsWith('OS:') && !cell1.startsWith('TOTAL')) {
      currentStore = cell1;
    }
    
    if (currentStore && !isNaN(Number(row[1])) && Number(row[1]) > 0 && row[1] !== 46258) {
      manualOSList.push({
        store: currentStore,
        os: Number(row[1]),
        date: row[2],
        value: typeof row[3] === 'number' ? row[3] : parseFloat(String(row[3] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.')),
        payments: row[4] || '',
        rowIdx: i
      });
    }
  }

  console.log('Total OSs na aba OS do Excel:', manualOSList.length);
  
  // Agora vamos ver na aba SALDO de onde vem o número de R$ 88.212,39 de "NA LOJA"
  const saldoSheet = manualWb.Sheets['SALDO'];
  const saldoRows = xlsx.utils.sheet_to_json(saldoSheet, { header: 1 });
  
  console.log('\n=== BUSCANDO TODAS AS CÉLULAS COM SOMAS DE "NA LOJA" OU OS POR LOJA NA ABA SALDO ===');
  for (let r = 0; r < saldoRows.length; r++) {
    const row = saldoRows[r];
    if (!row) continue;
    row.forEach((cell, c) => {
      const str = String(cell || '');
      if (str.toUpperCase().includes('NA LOJA') || str.toUpperCase().includes('PÁTIO') || str.toUpperCase().includes('PATIO') || str.toUpperCase().includes('88212') || str.toUpperCase().includes('88.212')) {
        console.log(`Linha ${r}, Coluna ${c}:`, row);
      }
    });
  }

  // Agora vamos comparar com o banco de dados patio_os
  const { data: dbOs } = await s.from('patio_os').select('*');
  const { data: stores } = await s.from('stores').select('*');
  const storeMap = {};
  stores.forEach(st => { storeMap[st.id] = st.name; });

  const activeDbOs = dbOs.filter(o => !['finalizada','finalizado','paga','pago','cancelada','cancelado'].includes(String(o.status).toLowerCase()));
  console.log('\nTotal OSs ativas no Banco (patio_os):', activeDbOs.length, '| Soma Restante: R$', activeDbOs.reduce((acc, o) => acc + Math.max(0, (o.total_value || 0) - (o.paid_value || 0)), 0).toFixed(2));

  // Cross check por OS number
  const dbOsMap = new Map();
  dbOs.forEach(o => {
    const key = `${o.store_id}_${o.os_number}`;
    dbOsMap.set(key, o);
  });

  console.log('\n--- OSs Ativas no Banco patio_os detalhadas: ---');
  activeDbOs.forEach(o => {
    const stName = storeMap[o.store_id] || o.store_id;
    const saldo = (o.total_value || 0) - (o.paid_value || 0);
    console.log(`Loja: ${stName.padEnd(20)} | OS #${String(o.os_number).padEnd(6)} | Status: ${String(o.status).padEnd(12)} | Total: R$ ${String(o.total_value).padStart(8)} | Pago: R$ ${String(o.paid_value).padStart(8)} | Saldo Restante: R$ ${saldo.toFixed(2).padStart(8)}`);
  });
}

run();
