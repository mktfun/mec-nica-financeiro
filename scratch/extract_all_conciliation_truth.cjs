const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const basePath = 'C:\\Users\\admin\\Desktop\\conciliacao';

function extractSummary(fileName) {
  const filePath = path.join(basePath, fileName);
  if (!fs.existsSync(filePath)) return null;

  const wb = xlsx.readFile(filePath, { cellFormula: true, cellHTML: false });
  const saldoSheet = wb.Sheets['SALDO'];
  const osSheet = wb.Sheets['OS'];
  const recSheet = wb.Sheets['RECEBIVEIS '];

  console.log(`\n======================================================`);
  console.log(`=== DETAILED SUMMARY: ${fileName} ===`);
  console.log(`======================================================`);

  // Let's dump all cells with values and formulas in SALDO sheet
  console.log('\n--- SALDO SHEET RAW CELLS ---');
  const range = xlsx.utils.decode_range(saldoSheet['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    let rowStr = '';
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
      const cell = saldoSheet[cellAddress];
      if (cell && (cell.v !== undefined || cell.f !== undefined)) {
        rowStr += `[${cellAddress}: v=${cell.v}, f=${cell.f || ''}] `;
      }
    }
    if (rowStr) console.log(`Row ${R + 1}: ${rowStr}`);
  }
}

['CONCILIAÇÃO 1708.xlsx', 'CONCILIAÇÃO 1808.xlsx', 'CONCILIAÇÃO 1908.xlsx'].forEach(extractSummary);
