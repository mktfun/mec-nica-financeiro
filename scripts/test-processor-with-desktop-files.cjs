const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:/Users/admin/Desktop/conciliacao/24-08';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().includes('conferenciaosxfinanceiro'));

console.log('=== PROCESSAMENTO EXATO DOS 10 ARQUIVOS DE OS ===');

let grandTotalOs = 0;
let grandPaidOs = 0;
let grandOpenOs = 0;
let totalOsCount = 0;

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
  let colMap = {};

  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (Array.isArray(row)) {
      const rowStr = row.map(c => String(c || '').toLowerCase().trim());
      if ((rowStr.includes('os') || rowStr.includes('nº os')) && rowStr.includes('status')) {
        headerRowIndex = i;
        rowStr.forEach((colName, idx) => {
          if (colName === 'os' || colName === 'nº os' || colName === 'nº da os' || colName === 'numero os' || colName === 'código' || colName === 'cod') colMap.os = idx;
          if (colName === 'data' || colName.includes('data entrada') || colName.includes('abertura') || (colName.includes('data') && colMap.openedAt === undefined)) colMap.openedAt = idx;
          if (colName === 'placa' || colName === 'veículo' || colName === 'veiculo') colMap.plate = idx;
          if (colName === 'status' || colName === 'situação' || colName === 'situacao') colMap.status = idx;
          if (colName.includes('liquidado') || colName.includes('total pago') || colName.includes('valor pago') || colName.includes('vlr pago') || colName.includes('vl pago') || colName === 'pago' || colName === 'recebido' || colName.includes('pagto') || colName.includes('pgto')) {
            colMap.paidValue = idx;
          }
          if (colName.includes('total') || colName.includes('bruto') || colName.includes('valor os') || colName.includes('valor final')) {
            if (!colName.includes('pagto') && !colName.includes('pago') && !colName.includes('produto') && !colName.includes('serviço') && !colName.includes('servico') && !colName.includes('desconto')) {
              colMap.totalValue = idx;
            }
          }
          if (colName.includes('pagamentos') || colName.includes('forma') || colName.includes('meio')) {
            colMap.paymentMethod = idx;
          }
        });
        break;
      }
    }
  }

  let storeTotal = 0, storePaid = 0, storeOpen = 0, count = 0;
  if (headerRowIndex !== -1) {
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const osVal = row[colMap.os];
      if (osVal === undefined || osVal === null || String(osVal).trim() === '') continue;
      const cleanOs = String(osVal).replace(/\D/g, '');
      if (!cleanOs) continue;

      const totalVal = typeof row[colMap.totalValue] === 'number' ? row[colMap.totalValue] : parseFloat(String(row[colMap.totalValue] || 0).replace(',', '.'));
      const paidVal = colMap.paidValue !== undefined ? (typeof row[colMap.paidValue] === 'number' ? row[colMap.paidValue] : parseFloat(String(row[colMap.paidValue] || 0).replace(',', '.'))) : 0;
      const status = String(row[colMap.status] || '').toLowerCase();
      const isClosed = status.includes('finaliz') || status.includes('concl') || status.includes('entreg');
      const realPaid = isClosed ? totalVal : (paidVal || 0);
      const openVal = Math.max(0, totalVal - realPaid);

      storeTotal += totalVal;
      storePaid += realPaid;
      storeOpen += openVal;
      count++;
    }
  }

  console.log(`Loja: ${storeAlias.padEnd(20)} (${fileName.padEnd(35)}) | OSs: ${count.toString().padStart(2)} | Total: R$ ${storeTotal.toFixed(2).padStart(10)} | Pago: R$ ${storePaid.toFixed(2).padStart(10)} | Pátio (Aberto): R$ ${storeOpen.toFixed(2).padStart(10)}`);
  grandTotalOs += storeTotal;
  grandPaidOs += storePaid;
  grandOpenOs += storeOpen;
  totalOsCount += count;
});

console.log('------------------------------------------------------------------------------------------------------------------------');
console.log(`TOTAL GERAL: OSs: ${totalOsCount} | Total R$: ${grandTotalOs.toFixed(2)} | Pago R$: ${grandPaidOs.toFixed(2)} | Pátio Em Aberto: R$ ${grandOpenOs.toFixed(2)}`);
