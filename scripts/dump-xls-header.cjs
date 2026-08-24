const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:\\Users\\admin\\Desktop\\conciliacao\\24-08';
const files = fs.readdirSync(dir).filter(f => f.includes('ConferenciaOS'));

for (const f of files) {
  const wb = xlsx.readFile(path.join(dir, f));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== Arquivo: ${f} ===`);
  rows.slice(0, 8).forEach((r, i) => console.log(`Row ${i}:`, r));
}
