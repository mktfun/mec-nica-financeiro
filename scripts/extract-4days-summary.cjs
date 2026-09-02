const xlsx = require('xlsx');
const path = require('path');

const files = [
  { day: '14/08 (Marco Zero)', date: '2026-08-14', file: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1408.xlsx' },
  { day: '17/08', date: '2026-08-17', file: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1708.xlsx' },
  { day: '18/08', date: '2026-08-18', file: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1808.xlsx' },
  { day: '19/08', date: '2026-08-19', file: 'C:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1908.xlsx' },
];

function extractDetails(wb, item) {
  const wsSaldo = wb.Sheets['SALDO'];
  const rows = xlsx.utils.sheet_to_json(wsSaldo, { header: 1, raw: false });
  
  let pilar1_saldo = 0, pilar1_neg = 0, pilar2_dinheiro_mp = 0, pilar3_a_receber = 0, pilar4_patio = 0;
  let caixa_atual = 0, caixa_anterior = 0, fluxo_caixa = 0;
  let fat_oi_base = 0, fat_ajustes = 0, fat_total = 0;
  let disp_contas = 0, subtotal_contas = 0, diferenca_final = 0;
  let odometro_hoje = 0, odometro_anterior = 0;
  let justificativas = [];

  rows.forEach((r, idx) => {
    if (!r) return;
    const lStr = r.join(' | ');

    r.forEach((cell, ci) => {
      const c = String(cell || '').trim();
      const valBefore = r[ci-1];
      const valAfter = r[ci+1];

      function parseVal(v) {
        if (typeof v === 'number') return v;
        if (!v) return 0;
        const cleaned = String(v).replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
      }

      if (c === 'SALDO') pilar1_saldo = parseVal(valBefore);
      if (c === 'DINHEIRO MP') pilar2_dinheiro_mp = parseVal(valBefore);
      if (c === 'A RECEBER') pilar3_a_receber = parseVal(valBefore);
      if (c === 'NA LOJA') pilar4_patio = parseVal(valBefore);
      if (c === 'NEGATIVO') pilar1_neg = parseVal(valBefore);
      if (c === 'CAIXA ATUAL') caixa_atual = parseVal(valBefore);
      if (c.includes('CAIXA ANTERIOR')) caixa_anterior = parseVal(valBefore);
      if (c.includes('FLUXO CAIXA')) fluxo_caixa = parseVal(valBefore);
      if (c === 'VALOR FATURAMENTO') fat_oi_base = parseVal(valBefore);
      if (c === 'FATURAMENTO ATUAL') fat_total = parseVal(valBefore);
      if (c === 'VALOR DISPONIVEL PARA O PAGAMENTO DE CONTAS') disp_contas = parseVal(valBefore);
      if (c === 'VALOR DAS CONTAS') subtotal_contas = parseVal(valBefore);

      // Odômetro
      if (c.includes('FATURAMENTO ATUAL') && parseVal(valBefore) > 100000) odometro_hoje = parseVal(valBefore);
      if (c.includes('FATURAMENTO ANTERIOR') && parseVal(valBefore) > 100000) odometro_anterior = parseVal(valBefore);
    });

    // Detectar linhas de ajuste de faturamento no DRE (Mauá / Kennedy / etc)
    if (idx >= 25 && idx <= 35) {
      r.forEach((cell, ci) => {
        const c = String(cell || '').trim();
        if (['REEMB', 'VENDA DE JUROS', 'CAPITAL DE GIRO', 'DEVOLUÇÃO', 'SEGURO', 'APORTE', 'PAGTO'].some(k => c.toUpperCase().includes(k))) {
          justificativas.push({ desc: c, val: r[ci-1] || r[ci+1] });
        }
      });
    }

    // Diferença final (normalmente linha 33, 34 ou 35)
    if (idx >= 30 && idx <= 36) {
      r.forEach((cell) => {
        if (cell && (String(cell).includes('R$') || typeof cell === 'number')) {
          const v = typeof cell === 'number' ? cell : parseFloat(String(cell).replace(/[^0-9.-]/g, ''));
          if (v && Math.abs(v) < 100 && !diferenca_final && v !== 0) {
            diferenca_final = v;
          }
        }
      });
    }
  });

  return {
    day: item.day,
    date: item.date,
    pilar1_saldo,
    pilar1_neg,
    pilar2_dinheiro_mp,
    pilar3_a_receber,
    pilar4_patio,
    caixa_atual,
    caixa_anterior,
    fluxo_caixa,
    odometro_hoje,
    odometro_anterior,
    fat_oi_base,
    fat_total,
    justificativas,
    disp_contas,
    subtotal_contas,
    diferenca_final
  };
}

const summaryTable = files.map(f => {
  const wb = xlsx.readFile(f.file);
  return extractDetails(wb, f);
});

console.log('=== TABELA RESUMO DOS 4 DIAS OFICIAIS DE CONCILIAÇÃO ===');
console.dir(summaryTable, { depth: null });
