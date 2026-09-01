const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\User\\Desktop\\concilia\\31-08';

const STORE_NAMES = {
  'st-01': 'Dom Pedro - DP',
  'st-02': 'Jabaquara - JAB',
  'st-03': 'Jorge Beretta - DHJV',
  'st-04': 'Kennedy - MP',
  'st-05': 'Piraporinha - EMPORIO',
  'st-06': 'Planalto - BRASICAR',
  'st-07': 'Rudge Ramos - CAP',
  'st-08': 'Santo André - HD',
  'st-09': 'Rei do Módulo - MP',
  '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f': 'Mauá - MHE'
};

const ACCOUNT_TO_STORE = {
  '8813_984633': 'st-01',
  '8813984633': 'st-01',
  '8813_984112': 'st-02',
  '8813984112': 'st-02',
  '3385_988047': 'st-03',
  '3385988047': 'st-03',
  '7386_175298': 'st-04',
  '7386175298': 'st-04',
  '7386_162601': 'st-05',
  '7386162601': 'st-05',
  '7386_166586': 'st-06',
  '7386166586': 'st-06',
  '0263_811531': 'st-07',
  '0263811531': 'st-07',
  '8813_994293': 'st-08',
  '8813994293': 'st-08',
  '8813_992677': 'st-09',
  '8813992677': 'st-09',
  '2783_070820': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
  '2783070820': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'
};

function parseOfx(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  
  let storeId = null;
  for (const [acc, sid] of Object.entries(ACCOUNT_TO_STORE)) {
    if (filename.replace(/-/g, '_').includes(acc)) {
      storeId = sid;
      break;
    }
  }

  const ledgerMatch = text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^\r\n<]+)/i);
  let balance = 0;
  if (ledgerMatch) {
    balance = parseFloat(ledgerMatch[1].trim().replace(',', '.'));
  }

  const trnMatches = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  let inTotal = 0;
  let outTotal = 0;
  let redeCredits = 0;

  for (const trn of trnMatches) {
    const amtMatch = trn.match(/<TRNAMT>([^\r\n<]+)/i);
    const memoMatch = trn.match(/<MEMO>([^\r\n<]+)/i);
    const memo = memoMatch ? memoMatch[1].trim() : '';
    if (amtMatch) {
      const amt = parseFloat(amtMatch[1].trim().replace(',', '.'));
      if (amt > 0) {
        inTotal += amt;
        if (/REDE|REDECARD|CIELO|STONE/i.test(memo)) {
          redeCredits += amt;
        }
      } else {
        outTotal += Math.abs(amt);
      }
    }
  }

  return {
    filename,
    storeId,
    balance: Math.round(balance * 100) / 100,
    inTotal: Math.round(inTotal * 100) / 100,
    outTotal: Math.round(outTotal * 100) / 100,
    redeCredits: Math.round(redeCredits * 100) / 100,
    count: trnMatches.length
  };
}

const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.ofx'));
console.log('================================================================================');
console.log('📊 AUDITORIA COMPLETA DOS 10 EXTRATOS OFX (PASTA 31-08-2026)');
console.log('================================================================================');

const storeBalances = {};
for (const f of files) {
  const res = parseOfx(path.join(baseDir, f));
  storeBalances[res.storeId] = res;
  const sname = STORE_NAMES[res.storeId] || 'DESCONHECIDA';
  console.log(sname.padEnd(23) + ' | Extrato: ' + res.filename.padEnd(33) + ' | Saldo: R$ ' + res.balance.toFixed(2).padStart(10) + ' | Entradas: R$ ' + res.inTotal.toFixed(2).padStart(8) + ' | Saídas: R$ ' + res.outTotal.toFixed(2).padStart(8) + ' | Rede: R$ ' + res.redeCredits.toFixed(2).padStart(8));
}

console.log('\n================================================================================');
console.log('💰 SALDO POSITIVO E NEGATIVO DETALHADO POR LOJA');
console.log('================================================================================');

let totalPositivo = 0;
let totalNegativo = 0;

for (const [sid, sname] of Object.entries(STORE_NAMES)) {
  const info = storeBalances[sid];
  const bal = info ? info.balance : 0;
  if (bal >= 0) {
    totalPositivo += bal;
    console.log(sname.padEnd(25) + ' | POSITIVO (Conta no Azul) | R$ ' + bal.toFixed(2).padStart(12));
  } else {
    totalNegativo += Math.abs(bal);
    console.log(sname.padEnd(25) + ' | CHEQUE ESPECIAL (-)     | -R$ ' + Math.abs(bal).toFixed(2).padStart(11));
  }
}

console.log('--------------------------------------------------------------------------------');
console.log('TOTAL SALDO POSITIVO (Ativos em Banco):          R$ ' + totalPositivo.toFixed(2).padStart(12));
console.log('TOTAL SALDO NEGATIVO (Cheque Especial Itaú):    -R$ ' + totalNegativo.toFixed(2).padStart(12));
console.log('SALDO LÍQUIDO CONSOLIDADO (Positivo - Negativo): R$ ' + (totalPositivo - totalNegativo).toFixed(2).padStart(12));
console.log('================================================================================');
