const xlsx = require('xlsx');
const path = 'C:/Users/admin/Downloads/CONCILIAÇÃO 2408 (1).xlsx';
const wb = xlsx.readFile(path);

console.log('SheetNames:', wb.SheetNames);
const sheet0 = wb.SheetNames[0];
console.log('--- SHEET 0:', sheet0, '---');
const ws = wb.Sheets[sheet0];
const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
json.forEach((r, idx) => {
  if (r.some(c => c !== '')) {
    const rowStr = r.map((c, ci) => c !== '' ? `[C${ci}]: ${c}` : null).filter(Boolean).join(' | ');
    console.log(`R${idx + 1}: ${rowStr}`);
  }
});
