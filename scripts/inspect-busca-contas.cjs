const xlsx = require('xlsx');
const path = 'C:/Users/admin/Desktop/conciliacao/24-08/BuscaContasAPagar (1).xls';
const wb = xlsx.readFile(path);
const ws = wb.Sheets[wb.SheetNames[0]];
const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('=== BuscaContasAPagar (1).xls ===');
console.log('Linhas:', json.length);

let total = 0;
json.forEach((r, idx) => {
  if (r.some(c => c !== '')) {
    console.log(`R${idx + 1}:`, JSON.stringify(r));
  }
});
