const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\admin\\Desktop\\conciliacao\\09-26\\03-09';

const ACCOUNT_STORE_MAPPING = {
  '0263811531': { id: 'st-01', name: 'Dom Pedro - DP' },
  '63304449':   { id: 'st-02', name: 'Jabaquara - JAB' },
  '8813994293': { id: 'st-02', name: 'Jabaquara - JAB' },
  '2783070820': { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  '7386162601': { id: 'st-04', name: 'Kennedy - MP' },
  '8813984633': { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  '7386166586': { id: 'st-06', name: 'Planalto - BRASICAR' },
  '8813984112': { id: 'st-07', name: 'Rudge Ramos - CAP' },
  '8813992677': { id: 'st-08', name: 'Santo André - HD' },
  '7386175298': { id: 'st-09', name: 'Rei do Módulo - MP' },
  '3385988047': { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' }
};

const ofxFiles = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.ofx'));

console.log('=== INSPEÇÃO DOS 10 OFX DE 03/09/2026 ===\n');

for (const file of ofxFiles) {
  const content = fs.readFileSync(path.join(dir, file), 'latin1');
  const acctId = content.match(/<ACCTID>([^<]+)/)?.[1]?.trim() || '';
  const store = ACCOUNT_STORE_MAPPING[acctId] || { id: 'unknown', name: 'Desconhecido: ' + acctId };

  const balAmt = parseFloat(content.match(/<BALAMT>([^<]+)/)?.[1] || '0');

  const stmtBlocks = content.split('<STMTTRN>').slice(1);
  let totalIn = 0;
  let totalOut = 0;
  let inCount = 0;
  let outCount = 0;
  const ins = [];
  const outs = [];

  for (const block of stmtBlocks) {
    const trnAmt = parseFloat(block.match(/<TRNAMT>([^<]+)/)?.[1] || '0');
    const memo = block.match(/<MEMO>([^<]+)/)?.[1]?.trim() || '';
    if (memo.includes('SALDO ANTERIOR') || memo.includes('SALDO DIA')) continue;

    if (trnAmt > 0) {
      totalIn += trnAmt;
      inCount++;
      ins.push({ memo, amount: trnAmt });
    } else if (trnAmt < 0) {
      totalOut += Math.abs(trnAmt);
      outCount++;
      outs.push({ memo, amount: Math.abs(trnAmt) });
    }
  }

  console.log(`📍 ${store.name} (${acctId}):`);
  console.log(`   Saldo Final: R$ ${balAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   Entradas (${inCount}): R$ ${totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Saídas (${outCount}): R$ ${totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  if (ins.length > 0) {
    console.log('   Entradas:', ins.map(i => `${i.memo}: R$ ${i.amount.toFixed(2)}`).join(' | '));
  }
  if (outs.length > 0) {
    console.log('   Saídas:', outs.slice(0, 5).map(o => `${o.memo}: R$ ${o.amount.toFixed(2)}`).join(' | '));
  }
  console.log();
}
