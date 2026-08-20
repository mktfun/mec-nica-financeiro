const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const basePath = 'C:\\Users\\admin\\Desktop\\conciliacao';

console.log('=== LISTING BASE PATH ===');
if (!fs.existsSync(basePath)) {
  console.log(`Path ${basePath} does not exist!`);
  process.exit(1);
}

const entries = fs.readdirSync(basePath);
console.log('Entries in Desktop/conciliacao:', entries);

entries.forEach(entry => {
  const full = path.join(basePath, entry);
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    console.log(`\n--- Directory: ${entry} ---`);
    const files = fs.readdirSync(full);
    files.forEach(f => {
      const fStat = fs.statSync(path.join(full, f));
      console.log(`  ${f} (${(fStat.size / 1024).toFixed(1)} KB)`);
    });
  }
});

const filesToInspect = [
  'CONCILIAÇÃO 1708.xlsx',
  'CONCILIAÇÃO 1808.xlsx',
  'CONCILIAÇÃO 1908.xlsx'
];

filesToInspect.forEach(fileName => {
  const filePath = path.join(basePath, fileName);
  if (fs.existsSync(filePath)) {
    console.log(`\n======================================================`);
    console.log(`=== ANALYZING: ${fileName} ===`);
    console.log(`======================================================`);
    const wb = xlsx.readFile(filePath);
    console.log('Sheet names:', wb.SheetNames);

    wb.SheetNames.forEach(sheetName => {
      console.log(`\n--- Sheet: ${sheetName} ---`);
      const sheet = wb.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      console.log(`Rows: ${data.length}`);
      // Show first 35 non-empty rows
      let count = 0;
      for (let r = 0; r < data.length && count < 40; r++) {
        const row = data[r];
        if (row.some(c => c !== '')) {
          console.log(`Row ${r + 1}:`, JSON.stringify(row.filter((c, i) => i < 15)));
          count++;
        }
      }
    });
  } else {
    console.log(`File ${fileName} NOT FOUND in ${basePath}`);
  }
});
