import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/Users/User/Downloads/1543_ConferenciaOSxFinanceiro.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

// Show ALL rows including footer
for (let i = 35; i < data.length; i++) {
  if (data[i] && data[i].length > 0) {
    console.log('ROW ' + i + ':', JSON.stringify(data[i]).substring(0, 300));
  }
}

// Also analyze payment methods found
const headerRow = data[3];
console.log('\nHEADER ROW:', JSON.stringify(headerRow));

// Collect all payment methods
const paymentMethods = new Set();
for (let i = 4; i < data.length - 3; i++) {
  const row = data[i];
  if (!row || row.length < 15) continue;
  const pmField = String(row[14] || '');
  if (pmField) {
    const parts = pmField.split(';').filter(p => p.trim());
    parts.forEach(p => {
      const method = p.split(':')[0].trim();
      if (method) paymentMethods.add(method);
    });
  }
}
console.log('\nPAYMENT METHODS FOUND:', [...paymentMethods]);

// Show what "Data" vs "Data do Faturamento" vs "Finalizada em" mean
console.log('\nDATE ANALYSIS (first 5 OS):');
for (let i = 4; i < 9; i++) {
  const row = data[i];
  if (!row) continue;
  const toDate = (v) => {
    if (typeof v === 'number') {
      const d = new Date((v - 25569) * 86400 * 1000);
      return d.toISOString().split('T')[0];
    }
    return v;
  };
  console.log(`OS ${row[0]}: Abertura(Data)=${toDate(row[1])}, FaturamentoData=${toDate(row[7])}, FinalizadaEm=${toDate(row[6])}`);
}
