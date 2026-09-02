const xlsx = require('xlsx');
const fs = require('fs');
require('dotenv').config();

const wb = xlsx.readFile('C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 0109.xlsx');

console.log('=== TABELAS DE PÁTIO (OS) POR LOJA NO EXCEL ===');
const wsOS = wb.Sheets['OS'];
const osData = xlsx.utils.sheet_to_json(wsOS, { header: 1 });
let currentStore = '';
let osList = [];

for (const row of osData) {
  if (!row || row.length === 0) continue;
  const col1 = String(row[1] || '').trim();
  const col2 = String(row[2] || '').trim();
  const col3 = row[3];
  const col4 = row[4];

  if (['Planalto', 'Piraporinha', 'Mauá', 'Kennedy', 'Rudge Ramos', 'Santo André', 'Rei do Modulo', 'Jorge Beretta', 'Dom Pedro I', 'Jabaquara'].some(s => col1.toLowerCase().includes(s.toLowerCase()))) {
    currentStore = col1;
    continue;
  }
  if (col1 === 'OS:' || col1 === 'Ordem de Serviço' || col1.includes('Tuesday')) continue;

  if (col1 && !isNaN(Number(col1))) {
    const osNum = col1;
    const val = typeof col3 === 'number' ? col3 : parseFloat(String(col3 || '0').replace(/[^0-9.-]/g, ''));
    osList.push({ store: currentStore, os: osNum, date: col2, valor_aberto: val, obs: col4 || '' });
  }
}

console.log(`Total de OSs em aberto no Excel: ${osList.length}`);
console.log(osList);

const sumByStore = {};
osList.forEach(o => {
  sumByStore[o.store] = (sumByStore[o.store] || 0) + o.valor_aberto;
});
console.log('Soma de Pátio por Loja no Excel:', sumByStore);
const totalPatioExcel = Object.values(sumByStore).reduce((a, b) => a + b, 0);
console.log('TOTAL PÁTIO EXCEL:', totalPatioExcel);
