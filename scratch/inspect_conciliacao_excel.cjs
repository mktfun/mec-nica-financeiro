const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const file = 'C:\\Users\\admin\\Downloads\\concilia1\\CONCILIAÇÃO 2307.xlsx';

if (fs.existsSync(file)) {
  const buf = fs.readFileSync(file);
  const wb = XLSX.read(buf, { type: 'buffer' });
  
  console.log('=== SHEETS IN CONCILIAÇÃO 2307.xlsx ===');
  console.log(wb.SheetNames);
  
  wb.SheetNames.forEach(sheetName => {
    console.log(`\n================ SHEET: ${sheetName} ================`);
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Total Rows: ${data.length}`);
    
    // Print first 25 rows
    data.slice(0, 30).forEach((row, idx) => {
      if (Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
        console.log(`Row ${idx}:`, row.filter(c => c !== null && c !== undefined && c !== '').slice(0, 10));
      }
    });
  });
} else {
  console.log('File not found:', file);
}
