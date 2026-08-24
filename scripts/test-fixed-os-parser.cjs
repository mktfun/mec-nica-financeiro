const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:/Users/admin/Desktop/conciliacao/24-08';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().includes('conferenciaosxfinanceiro'));

console.log('=== TESTE COM PARSER CORRIGIDO (R$ Total da OS e Restante na OS) ===');

let grandTotalVal = 0;
let grandPaidVal = 0;
let grandOpenVal = 0;
let grandClosedCount = 0;
let grandOpenCount = 0;

files.forEach(fileName => {
  const buf = fs.readFileSync(path.join(dir, fileName));
  const wb = xlsx.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

  let storeAlias = "";
  for (let i = 0; i < Math.min(200, data.length); i++) {
    const row = data[i];
    if (Array.isArray(row)) {
      const rowText = row.map(c => String(c || '')).join(' ');
      const match = rowText.match(/(?:LOJA|UNIDADE)\s+([A-Za-zÀ-ÿ0-9\s]+)|([A-Za-z0-9À-ÿ\s]+?)\s*[-–—]\s*Por Data d[ae] OS/i);
      if (match) {
        storeAlias = (match[1] || match[2]).trim();
        break;
      }
    }
  }

  let headerRowIndex = -1;
  let osCol = -1, totalCol = -1, paidCol = -1, restCol = -1, statusCol = -1, formCol = -1;

  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (Array.isArray(row)) {
      const rowStr = row.map(c => String(c || '').toLowerCase().trim());
      if (rowStr.includes('os') && rowStr.includes('status')) {
        headerRowIndex = i;
        rowStr.forEach((c, idx) => {
          if (c === 'os' || c === 'nº os') osCol = idx;
          if (c === 'status' || c === 'situação') statusCol = idx;
          if (c.includes('total da os') || c === 'r$ total da os' || c === 'vl total') totalCol = idx;
          if (c.includes('total pagto') || c === 'vl pago' || c === 'total pago') paidCol = idx;
          if (c.includes('restante na os') || c === 'restante') restCol = idx;
          if (c.includes('forma') || c.includes('pagamento')) formCol = idx;
        });
        break;
      }
    }
  }

  let storeTotal = 0, storePaid = 0, storeOpen = 0, openCount = 0, closedCount = 0;
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const osNum = row[osCol];
    if (osNum === undefined || osNum === null || String(osNum).trim() === '') continue;

    const totalVal = typeof row[totalCol] === 'number' ? row[totalCol] : parseFloat(String(row[totalCol] || 0).replace(',', '.'));
    const paidVal = typeof row[paidCol] === 'number' ? row[paidCol] : parseFloat(String(row[paidCol] || 0).replace(',', '.'));
    const restVal = typeof row[restCol] === 'number' ? row[restCol] : parseFloat(String(row[restCol] || 0).replace(',', '.'));
    const status = String(row[statusCol] || '').toLowerCase();
    const forms = String(row[formCol] || '');

    const isClosed = status.includes('finaliz') || status.includes('concl') || status.includes('entreg');
    const saldo = isClosed ? 0 : (restVal !== undefined && !isNaN(restVal) ? restVal : Math.max(0, totalVal - paidVal));

    if (!isNaN(totalVal)) storeTotal += totalVal;
    if (!isNaN(paidVal)) storePaid += paidVal;
    if (saldo > 0) {
      storeOpen += saldo;
      openCount++;
    } else {
      closedCount++;
    }
  }

  console.log(`Loja: ${storeAlias.padEnd(20)} | Total OSs: R$ ${storeTotal.toFixed(2).padStart(10)} | Pagas: R$ ${storePaid.toFixed(2).padStart(10)} | Em Aberto (Pátio): R$ ${storeOpen.toFixed(2).padStart(10)} (${openCount} abertas, ${closedCount} finalizadas)`);
  grandTotalVal += storeTotal;
  grandPaidVal += storePaid;
  grandOpenVal += storeOpen;
  grandOpenCount += openCount;
  grandClosedCount += closedCount;
});

console.log('------------------------------------------------------------------------------------------------------------------------');
console.log(`TOTAL GERAL: Total R$: ${grandTotalVal.toFixed(2)} | Pagas R$: ${grandPaidVal.toFixed(2)} | Pátio Em Aberto: R$ ${grandOpenVal.toFixed(2)} (${grandOpenCount} abertas, ${grandClosedCount} finalizadas)`);
