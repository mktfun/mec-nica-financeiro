const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('=== 1. ANALISANDO SHEET "OS" DO EXCEL MANUAL (CONCILIAÇÃO 2408 (1).xlsx) ===');
  const manualPath = 'C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 2408 (1).xlsx';
  const manualWb = xlsx.readFile(manualPath);
  const osSheet = manualWb.Sheets['OS'];
  const osRows = xlsx.utils.sheet_to_json(osSheet, { header: 1 });

  let currentStore = null;
  const manualStoreOS = {};
  
  for (let i = 0; i < osRows.length; i++) {
    const row = osRows[i];
    if (!row || row.length === 0) continue;
    
    // Check if store header
    const cell1 = String(row[1] || '').trim();
    if (cell1 && cell1 !== 'Ordem de Serviço' && isNaN(Number(cell1)) && !cell1.startsWith('OS:') && !cell1.startsWith('TOTAL')) {
      currentStore = cell1;
      if (!manualStoreOS[currentStore]) manualStoreOS[currentStore] = [];
    }
    
    // Check if OS row
    if (currentStore && !isNaN(Number(row[1])) && Number(row[1]) > 0 && row[1] !== 46258) {
      manualStoreOS[currentStore].push({
        os: Number(row[1]),
        date: row[2],
        value: typeof row[3] === 'number' ? row[3] : parseFloat(String(row[3] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.')),
        payments: row[4]
      });
    }
  }

  console.log('Lojas encontradas no Excel Manual (OS):', Object.keys(manualStoreOS));
  let grandTotalManual = 0;
  for (const [store, list] of Object.entries(manualStoreOS)) {
    const totalVal = list.reduce((acc, x) => acc + (x.value || 0), 0);
    grandTotalManual += totalVal;
    console.log(`Loja: ${store.padEnd(20)} | Total OSs: ${String(list.length).padStart(3)} | Soma Valor: R$ ${totalVal.toFixed(2).padStart(10)}`);
  }
  console.log(`GRAND TOTAL MANUAL OS: R$ ${grandTotalManual.toFixed(2)}`);

  console.log('\n=== 2. ANALISANDO ARQUIVOS _ConferenciaOSxFinanceiro.xls (Desktop 24-08) ===');
  const dir = 'C:\\Users\\admin\\Desktop\\conciliacao\\24-08';
  const osFiles = fs.readdirSync(dir).filter(f => f.includes('ConferenciaOS'));
  
  const filesStoreOS = {};
  let grandTotalFiles = 0;
  let grandPagoFiles = 0;
  
  for (const f of osFiles) {
    const wb = xlsx.readFile(path.join(dir, f));
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    filesStoreOS[f] = [];
    let sumTotal = 0;
    let sumPago = 0;
    
    // Pegar nome da loja no topo do arquivo se houver
    const storeHeader = rows[1] ? String(rows[1][1] || rows[1][0] || '') : '';
    
    rows.forEach((r, idx) => {
      if (idx > 3 && r[1] && !isNaN(Number(r[1]))) {
        const val = typeof r[9] === 'number' ? r[9] : parseFloat(String(r[9] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.'));
        const pago = typeof r[11] === 'number' ? r[11] : parseFloat(String(r[11] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.'));
        const formaPgto = r[13] || r[14] || '';
        filesStoreOS[f].push({
          os: Number(r[1]),
          dtAbertura: r[2],
          dtFechamento: r[3],
          status: r[8],
          total: val,
          pago: pago,
          saldo: (val || 0) - (pago || 0),
          forma: formaPgto
        });
        sumTotal += (val || 0);
        sumPago += (pago || 0);
      }
    });
    grandTotalFiles += sumTotal;
    grandPagoFiles += sumPago;
    console.log(`Arquivo: ${f.padEnd(35)} | Header: ${storeHeader.substring(0, 20).padEnd(20)} | OSs: ${String(filesStoreOS[f].length).padStart(3)} | Total: R$ ${sumTotal.toFixed(2).padStart(10)} | Pago: R$ ${sumPago.toFixed(2).padStart(10)} | Restante (Pátio): R$ ${(sumTotal - sumPago).toFixed(2).padStart(10)}`);
  }
  console.log(`GRAND TOTAL FILES: Total: R$ ${grandTotalFiles.toFixed(2)} | Pago: R$ ${grandPagoFiles.toFixed(2)} | Restante Pátio: R$ ${(grandTotalFiles - grandPagoFiles).toFixed(2)}`);

  console.log('\n=== 3. ANALISANDO BANCO DE DADOS (patio_os) ===');
  const { data: dbOs, error } = await s.from('patio_os').select('*');
  if (error) {
    console.error('DB Error:', error);
    return;
  }
  const { data: stores } = await s.from('stores').select('*');
  const storeMap = {};
  stores.forEach(st => { storeMap[st.id] = st.name; });

  const dbByStore = {};
  dbOs.forEach(o => {
    if (!dbByStore[o.store_id]) dbByStore[o.store_id] = [];
    dbByStore[o.store_id].push(o);
  });

  let grandTotalDbPatio = 0;
  console.log('Total registros patio_os no Supabase:', dbOs.length);
  for (const [st, list] of Object.entries(dbByStore)) {
    const storeName = storeMap[st] || st;
    const ativas = list.filter(o => !['finalizada','finalizado','paga','pago','cancelada','cancelado'].includes(String(o.status).toLowerCase()));
    const sumRestante = ativas.reduce((acc, o) => acc + (Math.max(0, (o.total_value || 0) - (o.paid_value || 0))), 0);
    const sumTotalAtivas = ativas.reduce((acc, o) => acc + (o.total_value || 0), 0);
    const sumPagoAtivas = ativas.reduce((acc, o) => acc + (o.paid_value || 0), 0);
    grandTotalDbPatio += sumRestante;
    console.log(`Store ${storeName.padEnd(25)} | Total OSs: ${String(list.length).padStart(3)} | Ativas: ${String(ativas.length).padStart(3)} | Pátio Restante: R$ ${sumRestante.toFixed(2).padStart(10)}`);
  }
  console.log(`GRAND TOTAL DB PATIO ATIVO: R$ ${grandTotalDbPatio.toFixed(2)}`);

  console.log('\n=== 4. ANALISANDO O QUE O EXCEL MANUAL CONSIDERA COMO "NA LOJA OS" OU "FATURAMENTO OS" ===');
  // Vamos ler a aba SALDO do Excel manual para ver os números exatos que o usuário colocou no fechamento
  const saldoSheet = manualWb.Sheets['SALDO'];
  const saldoRows = xlsx.utils.sheet_to_json(saldoSheet, { header: 1 });
  console.log('--- Conteúdo Chave da aba SALDO (primeiras 50 linhas com números): ---');
  saldoRows.slice(0, 50).forEach((r, idx) => {
    if (r && r.some(c => c !== undefined && c !== null && c !== '')) {
      console.log(`L${idx}:`, r);
    }
  });
}

run();
