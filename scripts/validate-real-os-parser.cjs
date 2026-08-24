const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:/Users/admin/Desktop/conciliacao/24-08';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().includes('conferenciaosxfinanceiro'));

console.log('=== TESTE DO PARSER REAL ===');

let totalOsGeral = 0;
let totalPagoGeral = 0;
let totalPatioGeral = 0;

files.forEach(fileName => {
  const buf = fs.readFileSync(path.join(dir, fileName));
  const wb = xlsx.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

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
          if (colName === 'status' || colName === 'situação' || colName === 'situacao') colMap.status = idx;
          
          const isExactTotal = ['total', 'r$ total', 'valor total', 'vlr total', 'vl total', 'valor os', 'valor da os', 'valor final', 'bruto', 'r$ total da os'].includes(colName);
          if (isExactTotal || colName.includes('total da os') || colName.includes('valor da os')) {
            if (!colName.includes('financeiro') && !colName.includes('pagto') && !colName.includes('pago') && !colName.includes('produto') && !colName.includes('serviço') && !colName.includes('servico') && !colName.includes('desconto')) {
              colMap.totalValue = idx;
            }
          } else if (colMap.totalValue === undefined && (colName.includes('total') || colName.includes('bruto'))) {
            if (!colName.includes('financeiro') && !colName.includes('pagto') && !colName.includes('pago') && !colName.includes('produto') && !colName.includes('serviço') && !colName.includes('servico') && !colName.includes('desconto')) {
              colMap.totalValue = idx;
            }
          }
          
          if (colName.includes('total pagto') || colName.includes('liquidado') || colName.includes('total pago') || colName.includes('valor pago') || colName.includes('vlr pago') || colName.includes('vl pago') || colName === 'pago' || colName === 'recebido' || colName.includes('pagto') || colName.includes('pgto')) {
            colMap.paidValue = idx;
          }
          
          if (colName.includes('restante na os') || colName === 'restante' || colName.includes('aberto') || colName.includes('falta') || colName.includes('saldo')) {
            colMap.openValue = idx;
          }
          
          if (colName.includes('forma') || colName.includes('pagamento') || colName.includes('meio') || colName.includes('regra') || colName.includes('negocia')) colMap.paymentMethod = idx;
        });
        break;
      }
    }
  }

  let storeTotal = 0, storePaid = 0, storeOpen = 0;
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    const rawOs = row[colMap.os];
    if (!rawOs || String(rawOs).toLowerCase().includes('total')) continue;

    const rawTotalValue = colMap.totalValue !== undefined ? Number(row[colMap.totalValue] || 0) : 0;
    const paidValue = colMap.paidValue !== undefined ? Number(row[colMap.paidValue] || 0) : 0;
    const openValue = colMap.openValue !== undefined ? Number(row[colMap.openValue] || 0) : 0;
    const statusStr = String(row[colMap.status] || '').toLowerCase();

    let totalValue = Math.max(rawTotalValue, paidValue + openValue);
    let finalPaidValue = paidValue;
    if (openValue > 0) {
      finalPaidValue = totalValue > openValue ? (totalValue - openValue) : paidValue;
    } else if (openValue === 0 && rawTotalValue > 0) {
      finalPaidValue = totalValue;
    }

    const isClosed = statusStr.match(/finalizad[oa]|pag[oa]|entregue|faturad[oa]|fechad[oa]|concluíd[oa]/i);
    const remOpen = isClosed ? 0 : (openValue > 0 ? openValue : Math.max(0, totalValue - finalPaidValue));

    storeTotal += totalValue;
    storePaid += finalPaidValue;
    storeOpen += remOpen;
  }

  console.log(`Arquivo: ${fileName.padEnd(35)} | Total: R$ ${storeTotal.toFixed(2).padStart(10)} | Pago: R$ ${storePaid.toFixed(2).padStart(10)} | Pátio Aberto: R$ ${storeOpen.toFixed(2).padStart(10)}`);
  totalOsGeral += storeTotal;
  totalPagoGeral += storePaid;
  totalPatioGeral += storeOpen;
});

console.log(`TOTAL GERAL: Total R$ ${totalOsGeral.toFixed(2)} | Pago R$ ${totalPagoGeral.toFixed(2)} | Pátio R$ ${totalPatioGeral.toFixed(2)}`);
