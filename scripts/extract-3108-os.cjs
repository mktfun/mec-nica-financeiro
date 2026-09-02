const xlsx = require('xlsx');

const wb = xlsx.readFile('C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 3108.xlsx');
const wsOS = wb.Sheets['OS'];
const rows = xlsx.utils.sheet_to_json(wsOS, { header: 1, raw: false });

console.log('=== TODAS AS ORDENS DE SERVIÇO DA ABA OS (31/08/2026) ===');
rows.forEach((r, i) => {
  if (!r || r.length === 0) return;
  console.log(`L${i+1}: ${r.filter(c => c !== undefined && c !== null && c !== '').join('  |  ')}`);
});
