const xlsx = require('xlsx');
const path = 'C:/Users/admin/Downloads/CONCILIAÇÃO 2408 (1).xlsx';
const wb = xlsx.readFile(path);
const ws = wb.Sheets['SALDO'];

// inspect formulas in SALDO sheet
for (const cellAddress in ws) {
  if (cellAddress[0] === '!') continue;
  const cell = ws[cellAddress];
  if (cell.f) {
    console.log(`Cell ${cellAddress}: Formula = ${cell.f} | Value = ${cell.v}`);
  }
}
