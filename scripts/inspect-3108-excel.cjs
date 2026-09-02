const xlsx = require('xlsx');

const wb = xlsx.readFile('C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 3108.xlsx');
console.log('Sheet Names:', wb.SheetNames);

const wsSaldo = wb.Sheets['SALDO'];
const rows = xlsx.utils.sheet_to_json(wsSaldo, { header: 1, raw: false });

console.log('=== PLANILHA CONCILIAÇÃO 3108.xlsx - TODAS AS LINHAS DE SALDO ===');
rows.forEach((r, idx) => {
  if (!r || r.length === 0) return;
  const lineStr = r.filter(c => c).join('  |  ');
  console.log(`L${idx+1}: ${lineStr}`);
});

// Se houver outras abas
wb.SheetNames.forEach(sheetName => {
  if (sheetName !== 'SALDO') {
    console.log(`\n=== ABA: ${sheetName} ===`);
    const ws = wb.Sheets[sheetName];
    const sRows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false });
    sRows.slice(0, 30).forEach((r, i) => {
      if (r && r.length > 0) {
        console.log(`L${i+1}:`, r.filter(c => c).join(' | '));
      }
    });
  }
});
