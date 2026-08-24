const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:/Users/admin/Desktop/conciliacao/24-08';
const f = '1698_ConferenciaOSxFinanceiro.xls';
const wb = xlsx.readFile(path.join(dir, f));
const ws = wb.Sheets[wb.SheetNames[0]];
const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('=== FIRST 10 ROWS OF 1698_ConferenciaOSxFinanceiro.xls ===');
json.slice(0, 10).forEach((r, idx) => {
  console.log(`R${idx + 1}:`, JSON.stringify(r));
});
