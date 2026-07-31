const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dir1 = 'C:\\Users\\admin\\Downloads\\concilia1';
const files = fs.readdirSync(dir1);

console.log('--- Simulating Full Parsing for concilia1 (Day 23) ---');

files.forEach(f => {
  const full = path.join(dir1, f);
  if (f.endsWith('.xls') || f.endsWith('.xlsx')) {
    try {
      const buf = fs.readFileSync(full);
      const wb = XLSX.read(buf, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      console.log(`\nFile: ${f} (${data.length} rows)`);

      // Check if it's OS file (.xls)
      if (f.endsWith('.xls')) {
        let headerRowIndex = -1;
        let colMap = {};
        for (let i = 0; i < Math.min(20, data.length); i++) {
          const row = data[i];
          if (Array.isArray(row)) {
            const rowStr = row.map(c => String(c || '').toLowerCase().trim());
            if ((rowStr.includes('os') || rowStr.includes('nº os')) && rowStr.includes('status')) {
              headerRowIndex = i;
              rowStr.forEach((colName, idx) => {
                if (colName === 'os' || colName === 'nº os' || colName === 'nº da os' || colName === 'numero os' || colName === 'código') colMap.os = idx;
                if (colName === 'data' || colName.includes('data entrada') || colName.includes('abertura') || (colName.includes('data') && colMap.openedAt === undefined)) colMap.openedAt = idx;
                if (colName === 'placa' || colName === 'veículo' || colName === 'veiculo') colMap.plate = idx;
                if (colName === 'status' || colName === 'situação' || colName === 'situacao') colMap.status = idx;
                if (colName === 'finalizada em' || colName === 'data fim' || colName.includes('fechamento') || colName.includes('finalizada') || colName.includes('saida') || colName.includes('saída')) colMap.closedAt = idx;
                if (colName.includes('total') || colName.includes('valor total') || colName.includes('r$ total') || colName.includes('vlr total') || colName.includes('vl total') || colName === 'valor' || colName.includes('bruto') || colName.includes('valor os') || colName.includes('valor final')) colMap.totalValue = idx;
                if (colName.includes('pagto') || colName.includes('liquidado') || colName.includes('total pago') || colName.includes('valor pago') || colName.includes('recebid') || colName === 'pago' || colName.includes('restante') || colName.includes('falta') || colName.includes('vlr pago') || colName.includes('vl pago') || colName.includes('valor liquido') || colName.includes('valor líquido')) colMap.paidValue = idx;
                if (colName.includes('forma') && (colName.includes('pagamento') || colName.includes('pgto'))) colMap.paymentMethod = idx;
              });
              break;
            }
          }
        }
        console.log(`  Header row: ${headerRowIndex}, ColMap:`, colMap);
        
        let validOsCount = 0;
        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!Array.isArray(row) || row.length === 0) continue;
          const rawOs = row[colMap.os];
          const osNumber = String(rawOs || '').trim();
          if (!osNumber || osNumber.toLowerCase() === 'os' || osNumber.length > 20 || isNaN(parseFloat(osNumber))) continue;
          
          validOsCount++;
        }
        console.log(`  Valid OS count: ${validOsCount}`);
      }

    } catch (e) {
      console.error(`ERROR parsing ${f}:`, e);
    }
  }
});
