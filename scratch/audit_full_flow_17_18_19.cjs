const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Let's import the actual parser logic or test the logic
const basePath = 'C:\\Users\\admin\\Desktop\\conciliacao';

// Let's read the store mapping from stores in src/lib/storeMapping.ts or similar
const STORE_MAP = {
  'PLANALTO': 'PLA',
  'PIRAPORINHA': 'PIR',
  'MAUA': 'MHE',
  'KENNEDY': 'MP',
  'RUDGE': 'HD',
  'SANTO ANDRE': 'EMP',
  'REI DO MODULO': 'RM',
  'JORGE BERETTA': 'JB',
  'DOM PEDRO': 'DP',
  'JABAQUARA': 'JAB'
};

async function auditFlow() {
  console.log('=== AUDITING DAILY CONCILIATION TRUTH (17/08, 18/08, 19/08) ===');

  // Let's inspect the exact numbers in the 3 Excel files
  const f17 = xlsx.readFile(path.join(basePath, 'CONCILIAÇÃO 1708.xlsx'));
  const f18 = xlsx.readFile(path.join(basePath, 'CONCILIAÇÃO 1808.xlsx'));
  const f19 = xlsx.readFile(path.join(basePath, 'CONCILIAÇÃO 1908.xlsx'));

  console.log('\n--- 1. COMPARISON OF PILARS & TOTALS ACROSS 17, 18, 19 ---');
  
  function getExcelData(wb, dateStr) {
    const s = wb.Sheets['SALDO'];
    const rows = xlsx.utils.sheet_to_json(s, { header: 1, defval: '' });
    
    // Let's find each key cell
    // In SALDO sheet:
    // G13: SALDO BANCOS
    // G14: DINHEIRO MP
    // G15: A RECEBER
    // G16: NA LOJA
    // G17: TOTAL
    // G18: NEGATIVO
    // G21: CAIXA ATUAL
    // G22: CAIXA ANTERIOR
    // G23: FLUXO CAIXA
    // G27: FATURAMENTO ATUAL
    // G28: FLUXO DE CAIXA
    // G29: DISPONIVEL CONTAS
    // G30: VALOR DAS CONTAS
    // G31: DIFERENCA
    // G48: JUROS ATUAL
    // G49: CONTAS
    
    console.log(`\n>>> DATE: ${dateStr}`);
    console.log(`G13 (Saldo Bancos):`, s['G13']?.v);
    console.log(`G14 (Dinheiro MP):`, s['G14']?.v);
    console.log(`G15 (A Receber):`, s['G15']?.v);
    console.log(`G16 (Na Loja OS):`, s['G16']?.v);
    console.log(`G18 (Negativo):`, s['G18']?.v);
    console.log(`G21 (Caixa Atual):`, s['G21']?.v);
    console.log(`G22 (Caixa Anterior):`, s['G22']?.v);
    console.log(`G23 (Fluxo Caixa):`, s['G23']?.v);
    console.log(`G27 (Faturamento Dia):`, s['G27']?.v);
    console.log(`G29 (Disponivel Contas):`, s['G29']?.v);
    console.log(`G48 (Juros):`, s['G48']?.v);
    console.log(`G49 (Contas Manual):`, s['G49']?.v);
    console.log(`G30 (Valor das Contas):`, s['G30']?.v);
    console.log(`G31 (Diferenca Final):`, s['G31']?.v);

    return {
      date: dateStr,
      saldo_bancos: s['G13']?.v,
      dinheiro_mp: s['G14']?.v,
      a_receber: s['G15']?.v,
      na_loja_os: s['G16']?.v,
      negativo: s['G18']?.v || 0,
      caixa_atual: s['G21']?.v,
      caixa_anterior: s['G22']?.v,
      fluxo_caixa: s['G23']?.v,
      faturamento_dia: s['G27']?.v,
      disponivel_contas: s['G29']?.v,
      juros: s['G48']?.v || 0,
      contas: s['G49']?.v || 0,
      valor_das_contas: s['G30']?.v,
      diferenca: s['G31']?.v
    };
  }

  const d17 = getExcelData(f17, '17/08/2026');
  const d18 = getExcelData(f18, '18/08/2026');
  const d19 = getExcelData(f19, '19/08/2026');

  console.log('\n--- 2. SUMMARY TABLE OF EXCEL TRUTH ---');
  console.table([d17, d18, d19]);
}

auditFlow().catch(console.error);
