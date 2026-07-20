import * as XLSX from 'xlsx';
import * as fs from 'fs';

const path = 'C:\\Users\\admin\\Downloads\\cnciliacao\\Rede_Rel_Vendas_17_07_2026-19_07_2026-1bb7d62a-bd85-4bf3-8792-2c657d336420.xlsx';
const buffer = fs.readFileSync(path);
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('--- FIRST 20 ROWS ---');
for(let i=0; i<20 && i<json.length; i++) {
  console.log(`ROW ${i}:`, JSON.stringify(json[i]));
}
