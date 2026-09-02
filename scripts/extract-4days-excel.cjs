const xlsx = require('xlsx');
const path = require('path');

const files = [
  { name: '14/08/2026 (Marco Zero)', file: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1408.xlsx' },
  { name: '17/08/2026', file: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1708.xlsx' },
  { name: '18/08/2026', file: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1808.xlsx' },
  { name: '19/08/2026', file: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1908.xlsx' },
];

function parseExcelDay(item) {
  const wb = xlsx.readFile(item.file);
  const wsSaldo = wb.Sheets['SALDO'];
  const rows = xlsx.utils.sheet_to_json(wsSaldo, { header: 1, raw: false });

  console.log(`\n======================================================`);
  console.log(`📑 PLANILHA: ${item.name} (${path.basename(item.file)})`);
  console.log(`======================================================`);

  const results = {};
  rows.forEach((r, i) => {
    if (!r || r.length === 0) return;
    const lineStr = r.filter(c => c).join(' | ');

    // Procurar termos-chave
    if (lineStr.includes('SALDO') && !lineStr.includes('Saldos')) {
      // console.log(`[SALDO]:`, r);
    }
    r.forEach((cell, ci) => {
      const c = String(cell || '').trim();
      if (c === 'SALDO') results.saldo_banco = r[ci-1] || r[ci+1];
      if (c === 'DINHEIRO MP') results.dinheiro_mp = r[ci-1] || r[ci+1];
      if (c === 'A RECEBER') results.a_receber = r[ci-1] || r[ci+1];
      if (c === 'NA LOJA') results.na_loja_os = r[ci-1] || r[ci+1];
      if (c === 'NEGATIVO') results.negativo_itau = r[ci-1] || r[ci+1];
      if (c === 'CAIXA ATUAL') results.caixa_atual = r[ci-1] || r[ci+1];
      if (c.includes('CAIXA ANTERIOR')) results.caixa_anterior = r[ci-1] || r[ci+1];
      if (c.includes('FLUXO CAIXA')) results.fluxo_caixa = r[ci-1] || r[ci+1];
      if (c.includes('VALOR FATURAMENTO') || c.includes('FATURAMENTO ATUAL')) results.faturamento = r[ci-1] || r[ci+1];
      if (c.includes('VALOR DISPONIVEL')) results.disp_contas = r[ci-1] || r[ci+1];
      if (c.includes('VALOR DAS CONTAS') || c.includes('CONTAS')) results.contas = r[ci-1] || r[ci+1];
    });
  });

  console.log('Resultados preliminares encontrados:', results);
  
  // Imprimir linhas chave com valores monetários e descrições
  rows.slice(0, 45).forEach((r, idx) => {
    const text = r.filter(c => c).join('  |  ');
    if (text) console.log(`L${idx+1}: ${text}`);
  });
}

files.forEach(f => parseExcelDay(f));
