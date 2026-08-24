const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:/Users/admin/Desktop/conciliacao/24-08';
const files = fs.readdirSync(dir);

console.log('=== ARQUIVOS EM C:/Users/admin/Desktop/conciliacao/24-08 ===');
console.log('Total de arquivos:', files.length);

// 1. Contas a Pagar
const contasFiles = files.filter(f => f.toLowerCase().includes('contasapagar'));
console.log('\n--- 1. CONTAS A PAGAR ---');
contasFiles.forEach(f => {
  const wb = xlsx.readFile(path.join(dir, f));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`Arquivo: ${f} | Linhas: ${json.length}`);
  let totalContas = 0;
  let rowCount = 0;
  json.forEach((r, idx) => {
    // find amount column
    r.forEach(cell => {
      if (typeof cell === 'number' && cell > 0 && cell < 100000) {
        // let's check headers
      }
    });
  });
});

// 2. OFX
const ofxFiles = files.filter(f => f.toLowerCase().endsWith('.ofx'));
console.log(`\n--- 2. EXTRATOS OFX (${ofxFiles.length} arquivos) ---`);
let totalOfxIn = 0;
let totalOfxOut = 0;
let storeOfxBalances = {};

ofxFiles.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'latin1');
  // parse balance
  const balMatch = content.match(/<BALAMT>([-\d.,]+)/);
  const acctMatch = content.match(/<ACCTID>([-\d]+)/);
  const bal = balMatch ? parseFloat(balMatch[1].replace(',', '.')) : 0;
  const acct = acctMatch ? acctMatch[1] : f;
  
  // parse transactions
  const trnMatches = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];
  let fileIn = 0, fileOut = 0;
  trnMatches.forEach(trn => {
    const amtMatch = trn.match(/<TRNAMT>([-\d.,]+)/);
    if (amtMatch) {
      const amt = parseFloat(amtMatch[1].replace(',', '.'));
      if (amt > 0) fileIn += amt;
      else fileOut += Math.abs(amt);
    }
  });
  console.log(`OFX: ${f.padEnd(35)} | Acct: ${acct.padEnd(10)} | Saldo Final: R$ ${bal.toFixed(2).padStart(10)} | Entradas: R$ ${fileIn.toFixed(2).padStart(10)} | Saidas: R$ ${fileOut.toFixed(2).padStart(10)}`);
  totalOfxIn += fileIn;
  totalOfxOut += fileOut;
});
console.log(`Total Entradas OFX: R$ ${totalOfxIn.toFixed(2)} | Total Saídas OFX: R$ ${totalOfxOut.toFixed(2)}`);

// 3. Rede
const redeFiles = files.filter(f => f.toLowerCase().includes('rede_rel_vendas'));
console.log(`\n--- 3. RELATÓRIOS REDE (${redeFiles.length} arquivos) ---`);
let totalRedeBruto = 0;
let totalRedeLiquido = 0;
let totalRedeTaxa = 0;

redeFiles.forEach(f => {
  const wb = xlsx.readFile(path.join(dir, f));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // search for header row with 'Valor Bruto' or 'Valor Líquido' or 'Taxa'
  let hIdx = -1;
  let bCol = -1, lCol = -1, tCol = -1;
  json.forEach((r, idx) => {
    r.forEach((c, ci) => {
      const str = String(c).toLowerCase();
      if (str.includes('bruto') || str.includes('valor venda')) bCol = ci;
      if (str.includes('líquido') || str.includes('liquido')) lCol = ci;
      if (str.includes('taxa') || str.includes('desconto')) tCol = ci;
    });
    if (bCol !== -1 && lCol !== -1 && hIdx === -1) hIdx = idx;
  });

  let fileBruto = 0, fileLiq = 0, fileTaxa = 0;
  if (hIdx !== -1) {
    json.slice(hIdx + 1).forEach(r => {
      const b = typeof r[bCol] === 'number' ? r[bCol] : parseFloat(String(r[bCol] || 0).replace(',', '.'));
      const l = typeof r[lCol] === 'number' ? r[lCol] : parseFloat(String(r[lCol] || 0).replace(',', '.'));
      const t = tCol !== -1 ? (typeof r[tCol] === 'number' ? r[tCol] : parseFloat(String(r[tCol] || 0).replace(',', '.'))) : (b - l);
      if (!isNaN(b) && b > 0) fileBruto += b;
      if (!isNaN(l) && l > 0) fileLiq += l;
      if (!isNaN(t) && t > 0) fileTaxa += t;
    });
  }
  console.log(`Rede: ${f.slice(0, 40).padEnd(42)} | Bruto: R$ ${fileBruto.toFixed(2).padStart(10)} | Líquido: R$ ${fileLiq.toFixed(2).padStart(10)} | Taxa: R$ ${fileTaxa.toFixed(2).padStart(8)}`);
  totalRedeBruto += fileBruto;
  totalRedeLiquido += fileLiq;
  totalRedeTaxa += fileTaxa;
});
console.log(`Total Rede Bruto: R$ ${totalRedeBruto.toFixed(2)} | Líquido: R$ ${totalRedeLiquido.toFixed(2)} | Taxas/Juros: R$ ${totalRedeTaxa.toFixed(2)}`);

// 4. OS Files
const osFiles = files.filter(f => f.toLowerCase().includes('conferenciaosxfinanceiro'));
console.log(`\n--- 4. RELATÓRIOS OS ERP (${osFiles.length} arquivos) ---`);
let totalOsValor = 0;
let totalOsPago = 0;

osFiles.forEach(f => {
  const wb = xlsx.readFile(path.join(dir, f));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`OS File: ${f.padEnd(35)} | Linhas: ${json.length}`);
});
