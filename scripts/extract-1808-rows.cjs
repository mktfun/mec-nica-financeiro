const xlsx = require('xlsx');

const wb = xlsx.readFile('C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1808.xlsx');
const ws = wb.Sheets['SALDO'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false });

console.log('=== DETALHAMENTO DE TODAS AS LINHAS DE SALDO 18/08 ===');
rows.forEach((r, i) => {
  if (r && r.length > 0 && r.some(c => c)) {
    console.log(`L${i+1}:`, JSON.stringify(r));
  }
});
