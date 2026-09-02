const xlsx = require('xlsx');

const wb = xlsx.readFile('C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 0109.xlsx');
const ws = wb.Sheets['SALDO'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false });

console.log('=== SALDO DETAILED EXTRACTION ===');
rows.forEach((r, i) => {
  if (r && r.length > 0 && r.some(c => c)) {
    console.log(`L${i+1}:`, JSON.stringify(r));
  }
});
