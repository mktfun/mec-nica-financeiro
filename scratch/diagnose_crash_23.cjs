const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dir1 = 'C:\\Users\\admin\\Downloads\\concilia1';

console.log('--- Testing Parsers on concilia1 (Day 23) ---');
const files = fs.readdirSync(dir1);

// Test Excel OS parsing
files.filter(f => f.endsWith('.xls')).forEach(f => {
  const full = path.join(dir1, f);
  try {
    const buf = fs.readFileSync(full);
    const wb = XLSX.read(buf, { type: 'buffer' });
    console.log(`OS File ${f}: Read successfully. SheetNames:`, wb.SheetNames);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`  Row count: ${data.length}`);
  } catch (e) {
    console.error(`  CRASH / ERROR in OS file ${f}:`, e.stack || e);
  }
});

// Test Rede XLSX parsing
files.filter(f => f.startsWith('Rede_Rel_Vendas') && f.endsWith('.xlsx')).forEach(f => {
  const full = path.join(dir1, f);
  try {
    const buf = fs.readFileSync(full);
    const wb = XLSX.read(buf, { type: 'buffer' });
    console.log(`Rede File ${f}: Read successfully. SheetNames:`, wb.SheetNames);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`  Rows count: ${rows.length}`);
    if (rows.length < 5) {
      console.log(`  WARNING: Rede file ${f} has fewer than 5 rows! Rows:`, rows);
    }
  } catch (e) {
    console.error(`  CRASH / ERROR in Rede file ${f}:`, e.stack || e);
  }
});
