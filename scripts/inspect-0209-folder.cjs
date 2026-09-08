const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dir = 'C:\\Users\\admin\\Desktop\\conciliacao\\09-26\\02-09';

async function inspectFolder() {
  console.log('=== INSPEÇÃO DOS ARQUIVOS DE 02/09/2026 ===\n');

  // 1. OFX
  const ofxFiles = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.ofx'));
  console.log(`🏦 Encontrados ${ofxFiles.length} extratos OFX:`);
  let totalOfxCredits = 0;
  let totalOfxDebits = 0;
  
  for (const file of ofxFiles) {
    const content = fs.readFileSync(path.join(dir, file), 'latin1');
    const bankId = content.match(/<BANKID>([^<]+)/)?.[1] || '';
    const acctId = content.match(/<ACCTID>([^<]+)/)?.[1] || '';
    const balAmt = content.match(/<BALAMT>([^<]+)/)?.[1] || '';
    const dtAsOf = content.match(/<DTASOF>([^<]+)/)?.[1] || '';
    
    // Contar transações
    const trnAmounts = [...content.matchAll(/<TRNAMT>([^<]+)/g)].map(m => parseFloat(m[1]));
    const credits = trnAmounts.filter(a => a > 0).reduce((s, a) => s + a, 0);
    const debits = trnAmounts.filter(a => a < 0).reduce((s, a) => s + Math.abs(a), 0);

    totalOfxCredits += credits;
    totalOfxDebits += debits;

    console.log(`   - ${file}: Conta ${acctId} | Saldo: R$ ${balAmt} (${dtAsOf.substring(0, 8)}) | Créditos: R$ ${credits.toFixed(2)} | Débitos: R$ ${debits.toFixed(2)}`);
  }
  console.log(`   👉 Total Geral OFX: Créditos R$ ${totalOfxCredits.toFixed(2)} | Débitos R$ ${totalOfxDebits.toFixed(2)}\n`);

  // 2. REDE
  const redeFiles = fs.readdirSync(dir).filter(f => f.startsWith('Rede_') && f.endsWith('.xlsx'));
  console.log(`💳 Encontrados ${redeFiles.length} arquivos da Rede:`);
  let totalRedeGross = 0;
  let totalRedeNet = 0;
  let totalRedeFees = 0;

  for (const file of redeFiles) {
    const wb = XLSX.readFile(path.join(dir, file));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Achar cabeçalho
    let hIdx = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = (data[i] || []).map(x => String(x || '').toLowerCase());
      if (row.some(c => c.includes('estabelecimento') || c.includes('cnpj'))) {
        hIdx = i;
        break;
      }
    }

    if (hIdx !== -1) {
      const headers = data[hIdx].map(x => String(x || '').trim());
      const estabIdx = headers.findIndex(h => h.toLowerCase().includes('estabelecimento') || h.toLowerCase().includes('nome fantasia'));
      const valBrutoIdx = headers.findIndex(h => h.toLowerCase().includes('valor da venda') || h.toLowerCase().includes('valor bruto') || h.toLowerCase().includes('original'));
      const valLiqIdx = headers.findIndex(h => h.toLowerCase().includes('valor l') || h.toLowerCase().includes('liquido') || h.toLowerCase().includes('líquido'));
      const taxaIdx = headers.findIndex(h => h.toLowerCase().includes('desconto') || h.toLowerCase().includes('taxa'));
      const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));

      let fileGross = 0;
      let fileNet = 0;
      let fileFees = 0;
      let estabName = 'Desconhecido';

      for (let r = hIdx + 1; r < data.length; r++) {
        const row = data[r];
        if (!row || row.length === 0) continue;
        if (estabIdx !== -1 && row[estabIdx]) estabName = String(row[estabIdx]);

        if (statusIdx !== -1) {
          const st = String(row[statusIdx] || '').toLowerCase();
          if (!st.includes('aprovad') && !st.includes('paga') && !st.includes('confirmad')) continue;
        }

        const parseNum = (v) => {
          if (!v) return 0;
          if (typeof v === 'number') return v;
          const s = String(v).replace(/\./g, '').replace(',', '.');
          const n = parseFloat(s);
          return isNaN(n) ? 0 : n;
        };

        const g = parseNum(row[valBrutoIdx]);
        const n = valLiqIdx !== -1 ? parseNum(row[valLiqIdx]) : g;
        const f = taxaIdx !== -1 ? parseNum(row[taxaIdx]) : (g - n);

        fileGross += g;
        fileNet += n;
        fileFees += f;
      }

      totalRedeGross += fileGross;
      totalRedeNet += fileNet;
      totalRedeFees += fileFees;

      console.log(`   - ${file.substring(0, 35)}...: Estab: "${estabName}" | Bruto: R$ ${fileGross.toFixed(2)} | Líquido: R$ ${fileNet.toFixed(2)} | Taxas: R$ ${fileFees.toFixed(2)}`);
    }
  }
  console.log(`   👉 Total Geral Rede: Bruto R$ ${totalRedeGross.toFixed(2)} | Líquido R$ ${totalRedeNet.toFixed(2)} | Taxas R$ ${totalRedeFees.toFixed(2)}\n`);

  // 3. CONTAS A PAGAR
  const contasFile = path.join(dir, 'BuscaContasAPagar.xls');
  if (fs.existsSync(contasFile)) {
    console.log(`📋 Inspecionando BuscaContasAPagar.xls...`);
    const wb = XLSX.readFile(contasFile);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`   - Total linhas: ${rows.length}`);
    let totalPago = 0;
    let totalAPagar = 0;
    let countPago = 0;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;
      const parseNum = (v) => {
        if (!v) return 0;
        if (typeof v === 'number') return v;
        const s = String(v).replace(/\./g, '').replace(',', '.');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
      };
      // Col 7: Dt. Pgto, Col 8: Vl. Pago, Col 9: Vl. a Pagar
      const vp = parseNum(r[7]);
      const vap = parseNum(r[8]);
      if (vp > 0) { totalPago += vp; countPago++; }
      if (vap > 0) { totalAPagar += vap; }
    }
    console.log(`   👉 Total Contas Pagas: R$ ${totalPago.toFixed(2)} (${countPago} títulos) | A Pagar: R$ ${totalAPagar.toFixed(2)}`);
  }
}

inspectFolder().catch(console.error);
