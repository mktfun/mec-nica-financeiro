const xlsx = require('xlsx');
const path = 'C:/Users/admin/Downloads/CONCILIAÇÃO 2408 (1).xlsx';
const wb = xlsx.readFile(path);
const ws = wb.Sheets['OS'];
const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

const storeSums = {};
let currentStore = '';

json.forEach((r, idx) => {
  const c1 = String(r[1] || '').trim();
  const c2 = String(r[2] || '').trim();
  const c3 = r[3];
  const c4 = String(r[4] || '').trim();

  // Check if store title
  if (c1 && !c2 && (c3 === '' || c3 === undefined) && isNaN(Number(c1))) {
    currentStore = c1;
    if (!storeSums[currentStore]) storeSums[currentStore] = { total: 0, oss: [] };
  } else if (c1 && !isNaN(Number(c1)) && currentStore) {
    const osNum = c1;
    const val = typeof c3 === 'number' ? c3 : Number(String(c3 || 0).replace(',', '.'));
    if (!isNaN(val)) {
      storeSums[currentStore].total += val;
      storeSums[currentStore].oss.push({ osNum, val, payment: c4 });
    }
  }
});

console.log('=== OSs POR LOJA NA PLANILHA EXCEL OFICIAL 24/08 ===');
let grandTotal = 0;
for (const [store, data] of Object.entries(storeSums)) {
  console.log(`\nLoja: ${store.padEnd(20)} | Total Pátio: R$ ${data.total.toFixed(2).padStart(10)} (${data.oss.length} OSs)`);
  grandTotal += data.total;
  data.oss.forEach(o => {
    console.log(`  OS #${o.osNum.padEnd(8)} | R$ ${o.val.toFixed(2).padStart(10)} | ${o.payment}`);
  });
}
console.log('\n-----------------------------------------------------------');
console.log(`TOTAL GERAL DO PÁTIO NO EXCEL: R$ ${grandTotal.toFixed(2)}`);
