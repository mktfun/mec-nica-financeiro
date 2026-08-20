const XLSX = require('xlsx');
const fs = require('fs');

console.log('=== FILES IN Desktop/conciliacao/19-08 ===');
const files19 = fs.readdirSync('c:\\Users\\admin\\Desktop\\conciliacao\\19-08');
files19.forEach(f => console.log(' ', f));

console.log('\n=== READING CONCILIAÇÃO 1908.xlsx ===');
const wb = XLSX.readFile('c:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1908.xlsx');
console.log('Sheet names:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  json.slice(0, 30).forEach((row, idx) => {
    if (row && row.some(cell => cell !== undefined && cell !== '')) {
      console.log(`[L${idx+1}]`, row.filter(c => c !== undefined && c !== '').join(' | '));
    }
  });
});
