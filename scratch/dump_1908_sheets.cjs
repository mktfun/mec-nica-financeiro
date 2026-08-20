const XLSX = require('xlsx');
const wb = XLSX.readFile('c:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1908.xlsx');

console.log('=== FULL OS SHEET ===');
const osSheet = wb.Sheets['OS'];
const osJson = XLSX.utils.sheet_to_json(osSheet, { header: 1, raw: false });
osJson.forEach((row, idx) => {
  if (row && row.some(cell => cell !== undefined && cell !== '')) {
    console.log(`[L${idx+1}]`, row.filter(c => c !== undefined && c !== '').join(' | '));
  }
});

console.log('\n=== FULL SALDO SHEET ===');
const saldoSheet = wb.Sheets['SALDO'];
const saldoJson = XLSX.utils.sheet_to_json(saldoSheet, { header: 1, raw: false });
saldoJson.forEach((row, idx) => {
  if (row && row.some(cell => cell !== undefined && cell !== '')) {
    console.log(`[L${idx+1}]`, row.filter(c => c !== undefined && c !== '').join(' | '));
  }
});
