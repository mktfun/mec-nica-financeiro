const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dir1 = 'C:\\Users\\admin\\Downloads\\concilia1';
const dir2 = 'C:\\Users\\admin\\Downloads\\cnciliacao';

console.log('--- Inspecting concilia1 ---');
if (fs.existsSync(dir1)) {
  const files = fs.readdirSync(dir1);
  console.log('Files in concilia1:', files);
  files.forEach(f => {
    const full = path.join(dir1, f);
    const stat = fs.statSync(full);
    console.log(`File: ${f}, Size: ${stat.size} bytes`);
    if (f.endsWith('.xls') || f.endsWith('.xlsx')) {
      try {
        const wb = XLSX.readFile(full);
        console.log(`  Sheets in ${f}:`, wb.SheetNames);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        console.log(`  Rows count in ${f}:`, json.length);
        if (json.length > 0) {
          console.log(`  First row sample:`, Object.keys(json[0]).slice(0, 5));
        }
      } catch (e) {
        console.error(`  Error reading ${f}:`, e.message);
      }
    }
  });
} else {
  console.log('concilia1 directory not found');
}

console.log('\n--- Inspecting cnciliacao ---');
if (fs.existsSync(dir2)) {
  const files = fs.readdirSync(dir2);
  console.log('Files in cnciliacao:', files);
  files.forEach(f => {
    const full = path.join(dir2, f);
    const stat = fs.statSync(full);
    console.log(`File: ${f}, Size: ${stat.size}`);
  });
}
