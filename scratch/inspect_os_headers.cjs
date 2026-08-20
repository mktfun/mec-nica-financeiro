const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('c:\\Users\\admin\\Desktop\\conciliacao\\19-08').filter(f => f.includes('ConferenciaOSxFinanceiro'));

console.log('=== INSPECTING STORE HEADERS IN 19-08 OS FILES ===');
files.forEach(fileName => {
  const full = path.join('c:\\Users\\admin\\Desktop\\conciliacao\\19-08', fileName);
  const wb = XLSX.readFile(full);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  console.log(`\nFile: ${fileName}`);
  for (let i = 0; i < Math.min(6, json.length); i++) {
    const r = json[i];
    if (r && r.some(c => c)) console.log(`  Row ${i+1}:`, r.filter(c => c).join(' | '));
  }
});
