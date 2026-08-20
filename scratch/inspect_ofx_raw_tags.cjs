const fs = require('fs');
const path = require('path');

const basePath = 'C:\\Users\\admin\\Desktop\\conciliacao';

['17-08', '18-08', '19-08'].forEach(folder => {
  const dir = path.join(basePath, folder);
  if (!fs.existsSync(dir)) return;
  console.log(`\n=== INSPECTING LEDGERBAL IN ${folder} ===`);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ofx'));
  files.forEach(f => {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    const ledger = txt.match(/<LEDGERBAL>[\s\S]*?<\/LEDGERBAL>/i) || txt.match(/<BALAMT>([^\r\n<]+)/i);
    const prv = txt.match(/<PRVBAL>[\s\S]*?<\/PRVBAL>/i);
    console.log(`File: ${f}`);
    console.log(`  LEDGER: ${ledger ? ledger[0].replace(/\r?\n/g, ' ') : 'NONE'}`);
    console.log(`  PRV: ${prv ? prv[0].replace(/\r?\n/g, ' ') : 'NONE'}`);
  });
});
