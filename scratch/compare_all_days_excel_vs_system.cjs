const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const basePath = 'C:\\Users\\admin\\Desktop\\conciliacao';

function parseExcelSheetSaldo(fileName) {
  const filePath = path.join(basePath, fileName);
  if (!fs.existsSync(filePath)) return null;

  const wb = xlsx.readFile(filePath);
  const saldoSheet = wb.Sheets['SALDO'];
  const data = xlsx.utils.sheet_to_json(saldoSheet, { header: 1, defval: '' });

  console.log(`\n======================================================`);
  console.log(`=== PARSING SUMMARY FROM: ${fileName} ===`);
  console.log(`======================================================`);

  // Let's find labels like SALDO, DINHEIRO MP, A RECEBER, NA LOJA, CAIXA ATUAL, CAIXA ANTERIOR, FLUXO CAIXA, FATURAMENTO, VALOR DAS CONTAS, DIFERENÇA
  let results = {};

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c]).trim().toUpperCase();
      if (val === 'SALDO' && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['saldo_bancos'] = row[c - 1];
      }
      if (val === 'DINHEIRO MP' && row[c - 1] !== undefined) {
        results['dinheiro_mp'] = row[c - 1];
      }
      if (val.includes('A RECEBER') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['a_receber'] = row[c - 1];
      }
      if ((val === 'NA LOJA' || val === 'NA LOJA OS') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['na_loja_os'] = row[c - 1];
      }
      if (val === 'NEGATIVO' && row[c - 1] !== undefined) {
        results['negativo'] = row[c - 1];
      }
      if (val.includes('CAIXA ATUAL') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['caixa_atual'] = row[c - 1];
      }
      if (val.includes('CAIXA ANTERIOR') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['caixa_anterior'] = row[c - 1];
      }
      if (val.includes('FLUXO CAIXA') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['fluxo_caixa'] = row[c - 1];
      }
      if (val.includes('VALOR FATURAMENTO') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['faturamento_dia'] = row[c - 1];
      }
      if (val.includes('FATURAMENTO ATUAL') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        if (!results['faturamento_odometro_atual']) results['faturamento_odometro_atual'] = row[c - 1];
      }
      if (val.includes('FATURAMENTO ANTERIOR') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['faturamento_odometro_anterior'] = row[c - 1];
      }
      if (val.includes('VALOR DISPONIVEL') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['disponivel_contas'] = row[c - 1];
      }
      if (val.includes('VALOR DAS CONTAS') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['valor_das_contas'] = row[c - 1];
      }
      if (val.includes('JUROS ATUAL') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['juros_atual'] = row[c - 1];
      }
      if (val.includes('CONTAS') && !val.includes('VALOR') && row[c - 1] !== undefined && typeof row[c - 1] === 'number') {
        results['contas_manual'] = row[c - 1];
      }
      if (val.includes('DEVOLUÇÃO') || val.includes('DEVOLUCAO')) {
        results['devolucao'] = { text: row[c], val: row[c - 1] };
      }
    }
  }

  console.log('Extracted metrics:', results);
  return results;
}

const s17 = parseExcelSheetSaldo('CONCILIAÇÃO 1708.xlsx');
const s18 = parseExcelSheetSaldo('CONCILIAÇÃO 1808.xlsx');
const s19 = parseExcelSheetSaldo('CONCILIAÇÃO 1908.xlsx');
