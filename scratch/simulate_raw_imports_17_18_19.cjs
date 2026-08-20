const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Let's test the OFX parser logic
function parseOfx(content) {
  let balance = 0;
  let ledgerMatch = content.match(/<BALAMT>([\d\.\-]+)/);
  if (ledgerMatch) {
    balance = parseFloat(ledgerMatch[1]);
  }

  let totalIn = 0;
  let totalOut = 0;

  const stmtTrnMatches = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];
  stmtTrnMatches.forEach(trn => {
    const amtMatch = trn.match(/<TRNAMT>([\d\.\-]+)/);
    if (amtMatch) {
      const amt = parseFloat(amtMatch[1]);
      if (amt > 0) totalIn += amt;
      else totalOut += Math.abs(amt);
    }
  });

  return { balance, totalIn, totalOut, trnCount: stmtTrnMatches.length };
}

// Let's inspect OFX files for each day
const basePath = 'C:\\Users\\admin\\Desktop\\conciliacao';

['17-08', '18-08', '19-08'].forEach(folder => {
  const dir = path.join(basePath, folder);
  if (!fs.existsSync(dir)) return;

  console.log(`\n======================================================`);
  console.log(`=== RAW OFX FILES FOR ${folder} ===`);
  console.log(`======================================================`);

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ofx'));
  let sumBalances = 0;
  let sumIn = 0;
  let sumOut = 0;

  files.forEach(f => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const parsed = parseOfx(content);
    console.log(`- ${f.padEnd(35)}: Bal=${parsed.balance.toFixed(2).padStart(10)} | In=${parsed.totalIn.toFixed(2).padStart(10)} | Out=${parsed.totalOut.toFixed(2).padStart(10)} | Trns=${parsed.trnCount}`);
    sumBalances += parsed.balance;
    sumIn += parsed.totalIn;
    sumOut += parsed.totalOut;
  });

  console.log(`>>> TOTALS FOR ${folder}:`);
  console.log(`    SUM OFX BALANCES: ${sumBalances.toFixed(2)}`);
  console.log(`    SUM OFX INFLOWS : ${sumIn.toFixed(2)}`);
  console.log(`    SUM OFX OUTFLOWS: ${sumOut.toFixed(2)}`);
});
