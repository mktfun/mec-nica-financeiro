const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const file = 'C:\\Users\\admin\\Downloads\\concilia1\\CONCILIAÇÃO 2307.xlsx';

if (fs.existsSync(file)) {
  console.log('Testing CONCILIAÇÃO 2307.xlsx...');
  const buf = fs.readFileSync(file);
  const wb = XLSX.read(buf, { type: 'buffer' });
  console.log('SheetNames:', wb.SheetNames);
  wb.SheetNames.forEach(sName => {
    const ws = wb.Sheets[sName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Sheet "${sName}": ${data.length} rows`);
  });
} else {
  console.log('File not found');
}
