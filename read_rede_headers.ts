import * as fs from 'fs';
import * as XLSX from 'xlsx';

const file = 'C:/Users/admin/Downloads/cnciliacao/Rede_Rel_Vendas_14_07_2026-14_07_2026-364be3f5-5266-410c-b1c1-f28803bd01ec.xlsx';
const buf = fs.readFileSync(file);
const workbook = XLSX.read(buf, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

for (let i = 0; i < Math.min(6, json.length); i++) {
  console.log(`Row ${i}:`);
  console.dir(json[i], { maxArrayLength: null });
}
