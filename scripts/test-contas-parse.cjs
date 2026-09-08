const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Simular parseContasAPagar
const file = 'C:\\Users\\admin\\Desktop\\conciliacao\\09-26\\02-09\\BuscaContasAPagar.xls';
const buffer = fs.readFileSync(file);
const wb = XLSX.read(buffer, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const headerRow = rows[3];
console.log('Headers:', headerRow);

let total = 0;
let count = 0;
for (let i = 4; i < rows.length; i++) {
  const r = rows[i];
  if (!r || r.length === 0) continue;
  const emp = r[1];
  const cod = r[2];
  const desc = r[4];
  const vlPago = r[12];
  const vlAPagar = r[9];
  const status = r[10];

  const amount = Number(vlPago) || Number(vlAPagar) || 0;
  if (amount > 0) {
    total += amount;
    count++;
    console.log(`- [${emp}] ${desc} | R$ ${amount.toFixed(2)} (${status})`);
  }
}

console.log(`\n👉 Total Contas a Pagar: R$ ${total.toFixed(2)} em ${count} itens`);
