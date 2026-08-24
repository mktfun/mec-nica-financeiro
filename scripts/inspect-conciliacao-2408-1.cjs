const xlsx = require('xlsx');
const path = 'C:/Users/admin/Downloads/CONCILIAÇÃO 2408 (1).xlsx';
const wb = xlsx.readFile(path);
console.log('Sheets in workbook:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  console.log('\n======================================================');
  console.log('SHEET:', sheetName);
  console.log('======================================================');
  const ws = wb.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log('Total rows:', json.length);
  json.forEach((r, idx) => {
    if (r.some(c => c !== '')) {
      const nonEmpties = r.map((c, ci) => c !== '' ? `[C${ci}]: ${c}` : null).filter(Boolean).join(' | ');
      console.log(`R${idx + 1}: ${nonEmpties}`);
    }
  });
});
