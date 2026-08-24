const xlsx = require('xlsx');
const path = 'C:/Users/admin/Downloads/CONCILIAÇÃO 2408 (1).xlsx';
const wb = xlsx.readFile(path);
const ws = wb.Sheets['OS'];

const subtotalCells = ['D15', 'D28', 'D37', 'D44', 'D60', 'D70', 'D82', 'D94', 'D101', 'D111'];

console.log('=== SUBTOTAIS DA ABA OS NO EXCEL ===');
subtotalCells.forEach(addr => {
  const cell = ws[addr];
  console.log(`Cell ${addr}: Formula = ${cell ? cell.f : 'none'} | Value = ${cell ? cell.v : 'empty'}`);
});

// Also print the rows around each subtotal
console.log('\n=== DETALHE DAS LINHAS NA ABA OS ===');
const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
json.forEach((r, idx) => {
  const rowNum = idx + 1;
  const c0 = r[0], c1 = r[1], c2 = r[2], c3 = r[3], c4 = r[4], c5 = r[5];
  if (c1 || c2 || c3 || c4) {
    console.log(`R${rowNum}: [C1]: ${c1} | [C2]: ${c2} | [C3]: ${c3} | [C4]: ${c4} | [C5]: ${c5}`);
  }
});
