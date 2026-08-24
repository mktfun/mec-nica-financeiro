const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:/Users/admin/Desktop/conciliacao/24-08';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().includes('conferenciaosxfinanceiro'));

console.log('=== PARSING OS FILES DAS FONTES BRUTAS ===');

files.forEach(f => {
  const wb = xlsx.readFile(path.join(dir, f));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  let headerIdx = -1;
  let osCol = -1, valCol = -1, paidCol = -1, formCol = -1, dateCol = -1, storeName = '';

  json.forEach((r, idx) => {
    // Detect store name from top rows
    r.forEach(c => {
      const s = String(c);
      if (s.includes('MP') || s.includes('Rei') || s.includes('Brasicar') || s.includes('Jabaquara') || s.includes('Planalto')) {
        if (!storeName) storeName = s;
      }
    });

    r.forEach((c, ci) => {
      const str = String(c).toLowerCase().trim();
      if (str === 'os' || str === 'nº os' || str === 'numero os') osCol = ci;
      if (str === 'vl total' || str === 'valor total' || str === 'total os') valCol = ci;
      if (str === 'vl pago' || str === 'valor pago' || str === 'pago') paidCol = ci;
      if (str === 'forma pgto' || str === 'forma' || str === 'pagamentos') formCol = ci;
    });
    if (osCol !== -1 && valCol !== -1 && headerIdx === -1) headerIdx = idx;
  });

  console.log(`\nFile: ${f} | Store: ${storeName} | Header Row: ${headerIdx + 1}`);
  let totalVal = 0, totalPaid = 0, openVal = 0;
  let count = 0;
  if (headerIdx !== -1) {
    json.slice(headerIdx + 1).forEach((r, rowIdx) => {
      const osNum = String(r[osCol] || '').trim();
      if (osNum && !isNaN(Number(osNum))) {
        const val = typeof r[valCol] === 'number' ? r[valCol] : parseFloat(String(r[valCol] || 0).replace(',', '.'));
        const paid = paidCol !== -1 ? (typeof r[paidCol] === 'number' ? r[paidCol] : parseFloat(String(r[paidCol] || 0).replace(',', '.'))) : 0;
        const form = formCol !== -1 ? String(r[formCol] || '') : '';
        const saldo = Math.max(0, (val || 0) - (paid || 0));
        if (!isNaN(val)) totalVal += val;
        if (!isNaN(paid)) totalPaid += paid;
        openVal += saldo;
        count++;
        console.log(`  OS #${osNum.padEnd(8)} | Total: R$ ${val.toFixed(2).padStart(10)} | Pago: R$ ${(paid||0).toFixed(2).padStart(10)} | Saldo: R$ ${saldo.toFixed(2).padStart(10)} | Pgto: ${form}`);
      }
    });
  }
  console.log(`  >>> Total OSs: ${count} | Total R$: ${totalVal.toFixed(2)} | Pago R$: ${totalPaid.toFixed(2)} | Em Aberto R$: ${openVal.toFixed(2)}`);
});
