const XLSX = require('xlsx');
const path = require('path');

const file = 'C:\\Users\\admin\\Desktop\\conciliacao\\09-26\\02-09\\BuscaContasAPagar.xls';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Primeiras 12 linhas de BuscaContasAPagar.xls:');
data.slice(0, 12).forEach((row, i) => {
  console.log(`Linha ${i}:`, JSON.stringify(row));
});
