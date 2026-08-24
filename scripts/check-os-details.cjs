const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:\\Users\\admin\\Desktop\\conciliacao\\24-08';
const files = fs.readdirSync(dir).filter(f => f.includes('ConferenciaOS'));

for (const f of files) {
  const wb = xlsx.readFile(path.join(dir, f));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  rows.forEach((r, idx) => {
    if (idx > 3 && r[1]) {
      const osNum = Number(r[1]);
      if (osNum === 2326 || osNum === 1847 || osNum === 2393 || osNum === 2392 || osNum === 2391 || osNum === 2390 || osNum === 2378) {
        console.log(`File: ${f.padEnd(35)} | OS: ${String(osNum).padEnd(6)} | Status: ${String(r[8]).padEnd(15)} | Total: ${String(r[9]).padStart(8)} | Pago: ${String(r[11]).padStart(8)} | Pgto: ${r[13] || ''} ${r[14] || ''}`);
      }
    }
  });
}
