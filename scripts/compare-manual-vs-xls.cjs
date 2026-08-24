const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:\\Users\\admin\\Desktop\\conciliacao\\24-08';
const manualPath = 'C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 2408 (1).xlsx';

// 1. Ler o Excel Manual na aba OS
const manualWb = xlsx.readFile(manualPath);
const osSheet = manualWb.Sheets['OS'];
const osRows = xlsx.utils.sheet_to_json(osSheet, { header: 1 });

const manualByStore = {};
let currentStore = null;

for (let i = 0; i < osRows.length; i++) {
  const row = osRows[i];
  if (!row || row.length === 0) continue;
  
  const cell1 = String(row[1] || '').trim();
  if (cell1 && cell1 !== 'Ordem de Serviço' && isNaN(Number(cell1)) && !cell1.startsWith('OS:') && !cell1.startsWith('TOTAL')) {
    currentStore = cell1;
    if (!manualByStore[currentStore]) manualByStore[currentStore] = [];
  }
  
  if (currentStore && !isNaN(Number(row[1])) && Number(row[1]) > 0 && row[1] !== 46258) {
    manualByStore[currentStore].push({
      os: Number(row[1]),
      date: row[2],
      value: typeof row[3] === 'number' ? row[3] : parseFloat(String(row[3] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.')),
      payments: row[4] || '',
      rowIdx: i + 1
    });
  }
}

// 2. Ler os 10 arquivos XLS de ConferenciaOS
const files = fs.readdirSync(dir).filter(f => f.includes('ConferenciaOS'));
const filesByStore = {};

for (const f of files) {
  const wb = xlsx.readFile(path.join(dir, f));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const header = rows[2] ? String(rows[2][0] || '') : '';
  let storeKey = header.split('-')[0].trim();
  
  filesByStore[storeKey] = {
    file: f,
    header: header,
    oss: []
  };
  
  rows.forEach((r, idx) => {
    if (idx > 3 && r[0] && !isNaN(Number(r[0]))) {
      const osNum = Number(r[0]);
      const status = String(r[5] || '');
      const total = typeof r[10] === 'number' ? r[10] : parseFloat(String(r[10] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.'));
      const pago = typeof r[11] === 'number' ? r[11] : parseFloat(String(r[11] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.'));
      const restante = typeof r[12] === 'number' ? r[12] : parseFloat(String(r[12] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.'));
      const pgto = String(r[14] || '');
      
      filesByStore[storeKey].oss.push({
        os: osNum,
        cliente: r[2],
        placa: r[3],
        status: status,
        total: total || 0,
        pago: pago || 0,
        restante: restante || 0,
        pgto: pgto
      });
    }
  });
}

console.log('=== MAPEAMENTO E COMPARAÇÃO LOJA POR LOJA ===');
console.log('Lojas no Manual:', Object.keys(manualByStore));
console.log('Lojas nos Arquivos XLS:', Object.keys(filesByStore));

for (const [manStore, manList] of Object.entries(manualByStore)) {
  console.log(`\n======================================================`);
  console.log(`LOJA MANUAL: [${manStore}] — Total OSs na aba OS: ${manList.length}`);
  console.log(`======================================================`);
  
  // Achar o storeKey correspondente
  let matchedKey = Object.keys(filesByStore).find(k => 
    k.toLowerCase().includes(manStore.toLowerCase().replace(/\s+/g, '')) ||
    manStore.toLowerCase().includes(k.toLowerCase().replace('mp', '').replace('reidooleo', ''))
  );
  
  if (!matchedKey) {
    if (manStore.includes('Planalto')) matchedKey = 'MPplanalto';
    else if (manStore.includes('Piraporinha')) matchedKey = 'MPpiraporinha';
    else if (manStore.includes('Mauá')) matchedKey = 'ReiDoOleoMaua';
    else if (manStore.includes('Kennedy')) matchedKey = 'MPkennedy';
    else if (manStore.includes('Rudge')) matchedKey = 'MPrudge';
    else if (manStore.includes('Santo André')) matchedKey = 'MPSantoAndre';
    else if (manStore.includes('Rei do Modulo')) matchedKey = 'MPReiDoModulo';
    else if (manStore.includes('Jorge Beretta')) matchedKey = 'MPjorgeberetta';
    else if (manStore.includes('Dom Pedro')) matchedKey = 'MPdompedro1';
    else if (manStore.includes('Jabaquara')) matchedKey = 'MPJabaquara';
  }
  
  const fileData = filesByStore[matchedKey];
  if (!fileData) {
    console.log('Nenhum arquivo XLS correspondente para', manStore);
    continue;
  }
  
  console.log(`Arquivo XLS: ${fileData.file} (${matchedKey}) — Total OSs no arquivo: ${fileData.oss.length}`);
  
  // OSs que estão no Excel Manual:
  console.log('\n--- OSs no Excel Manual vs Arquivo XLS: ---');
  manList.forEach(m => {
    const fOS = fileData.oss.find(x => x.os === m.os);
    if (!fOS) {
      console.log(`❌ OS #${String(m.os).padEnd(6)} no Manual (R$ ${m.value}) -> NÃO ENCONTRADA no arquivo XLS!`);
    } else {
      const matchStatus = (m.value === fOS.total || m.value === fOS.restante || m.value === 0);
      console.log(`✓ OS #${String(m.os).padEnd(6)} | Manual Val: R$ ${String(m.value).padStart(8)} | Pgto: ${m.payments.padEnd(25)} | XLS Status: ${fOS.status.padEnd(12)} | XLS Total: R$ ${String(fOS.total).padStart(8)} | XLS Pago: R$ ${String(fOS.pago).padStart(8)} | XLS Restante: R$ ${String(fOS.restante).padStart(8)}`);
    }
  });

  // OSs que estão no arquivo XLS mas NÃO estão no Manual:
  const manOSSet = new Set(manList.map(x => x.os));
  const missingInManual = fileData.oss.filter(x => !manOSSet.has(x.os));
  const missingAtivas = missingInManual.filter(x => !['finalizada','finalizado','paga','pago','cancelada','cancelado'].includes(x.status.toLowerCase()));
  
  if (missingAtivas.length > 0) {
    console.log('\n⚠️ OSs ATIVAS no arquivo XLS que NÃO ESTÃO na aba OS do Excel Manual:');
    missingAtivas.forEach(x => {
      console.log(`   OS #${String(x.os).padEnd(6)} | Status: ${x.status.padEnd(12)} | Total: R$ ${String(x.total).padStart(8)} | Pago: R$ ${String(x.pago).padStart(8)} | Restante: R$ ${String(x.restante).padStart(8)}`);
    });
  }
}
