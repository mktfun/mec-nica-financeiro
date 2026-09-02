const xlsx = require('xlsx');

const wb18 = xlsx.readFile('C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1808.xlsx');
const ws18 = wb18.Sheets['SALDO'];
const rows18 = xlsx.utils.sheet_to_json(ws18, { header: 1, raw: false });

console.log('=== SALDOS DAS 10 LOJAS EM 18/08/2026 (EXCEL) ===');
rows18.forEach((r, i) => {
  const line = (r || []).filter(c => c).join(' | ');
  if (line.includes('Saldo Banco') || line.includes('PLANALTO') || line.includes('PIRAPORINHA') || line.includes('MAUÁ') || line.includes('KENNEDY') || line.includes('RUDGE') || line.includes('SANTO ANDRÉ') || line.includes('REI DO') || line.includes('JORGE') || line.includes('DOM PEDRO') || line.includes('JABAQUARA')) {
    console.log(`L${i+1}: ${line}`);
  }
});
