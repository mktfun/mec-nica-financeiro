const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const basePath = 'C:\\Users\\admin\\Desktop\\conciliacao';

function smartExtract(fileName) {
  const filePath = path.join(basePath, fileName);
  if (!fs.existsSync(filePath)) return null;

  const wb = xlsx.readFile(filePath, { cellFormula: true });
  const s = wb.Sheets['SALDO'];
  const data = xlsx.utils.sheet_to_json(s, { header: 1, defval: '' });

  console.log(`\n======================================================`);
  console.log(`=== SMART EXTRACTION FOR: ${fileName} ===`);
  console.log(`======================================================`);

  let metrics = {};

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c]).trim();
      const norm = cellVal.toUpperCase().replace(/\s+/g, ' ');

      // Check if this cell is a label
      if (norm === 'SALDO') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Pilar 1 (Saldo Bancos)'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      } else if (norm === 'DINHEIRO MP') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Pilar 2 (Dinheiro MP)'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      } else if (norm === 'A RECEBER') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Pilar 3 (A Receber)'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      } else if (norm === 'NA LOJA' || norm === 'NA LOJA OS') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Pilar 4 (Na Loja OS)'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      } else if (norm === 'NEGATIVO') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Negativo'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      } else if (norm === 'CAIXA ATUAL') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Caixa Atual'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      } else if (norm === 'CAIXA ANTERIOR') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Caixa Anterior'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      } else if (norm === 'FLUXO CAIXA' || norm === 'FLUXO DE CAIXA') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        if (!metrics['Fluxo de Caixa']) {
          metrics['Fluxo de Caixa'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
        }
      } else if (norm.includes('VALOR FATURAMENTO') || norm === 'FATURAMENTO ATUAL') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        if (!metrics['Faturamento do Dia']) {
          metrics['Faturamento do Dia'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f, label: norm };
        }
      } else if (norm.includes('VALOR DISPONIVEL')) {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Disponivel p/ Contas'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      } else if (norm.includes('VALOR DAS CONTAS')) {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        const diffCell = xlsx.utils.encode_cell({ r: r + 1, c: c - 1 });
        metrics['Valor das Contas (Total)'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
        metrics['Diferenca Final'] = { val: data[r + 1]?.[c - 1], cell: diffCell, formula: s[diffCell]?.f };
      } else if (norm === 'JUROS ATUAL') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Juros Atual'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      } else if (norm === 'CONTAS') {
        const valCell = xlsx.utils.encode_cell({ r, c: c - 1 });
        metrics['Contas Manual'] = { val: row[c - 1], cell: valCell, formula: s[valCell]?.f };
      }
    }
  }

  for (const [k, v] of Object.entries(metrics)) {
    console.log(`${k.padEnd(28)} : ${String(v.val).padStart(15)}  [Cell ${v.cell}${v.formula ? `, formula: =${v.formula}` : ''}]`);
  }

  return metrics;
}

['CONCILIAÇÃO 1708.xlsx', 'CONCILIAÇÃO 1808.xlsx', 'CONCILIAÇÃO 1908.xlsx'].forEach(smartExtract);
