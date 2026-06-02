import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/Users/User/Downloads/1543_ConferenciaOSxFinanceiro.xls');
console.log('Sheets:', wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
console.log('Total rows:', data.length);

// Print first 35 rows
for (let i = 0; i < 35; i++) {
  if (data[i] && data[i].length > 0) {
    console.log('ROW ' + i + ' (' + data[i].length + ' cols):', JSON.stringify(data[i]).substring(0, 300));
  }
}
