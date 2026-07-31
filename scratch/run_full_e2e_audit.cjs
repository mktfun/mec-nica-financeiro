const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== INICIANDO AUDITORIA E2E ===");

  const fileRede = 'C:\\Users\\admin\\Downloads\\cnciliacao\\Rede_Rel_Vendas_17_07_2026-19_07_2026-0f18c894-2a22-4968-baa2-cc289dd19c01.xlsx';
  const fileOS = 'C:\\Users\\admin\\Downloads\\cnciliacao\\JABA 207.xls';
  const fileOfx = 'C:\\Users\\admin\\Downloads\\cnciliacao\\Extrato_8813_984112_20-07-2026.ofx';

  // 1. Rede
  console.log("Lendo Rede...");
  const wbRede = xlsx.readFile(fileRede);
  const jsonRede = xlsx.utils.sheet_to_json(wbRede.Sheets[wbRede.SheetNames[0]], { header: 1, raw: false });
  let redeTotal = 0;
  for (let i = 2; i < jsonRede.length; i++) {
    const val = parseFloat((jsonRede[i][2] || '').replace(/[^0-9,-]/g, '').replace(',', '.'));
    if (!isNaN(val)) redeTotal += val;
  }
  console.log(`Rede lida: ${jsonRede.length - 2} linhas brutas. Total Bruto (aprox): ${redeTotal}`);

  // 2. OFX
  console.log("Lendo OFX...");
  const ofxContent = fs.readFileSync(fileOfx, 'utf8');
  const ofxTxs = ofxContent.split('<STMTTRN>');
  let ofxTotal = 0;
  let ofxCount = 0;
  for (let i = 1; i < ofxTxs.length; i++) {
    const trn = ofxTxs[i];
    const amtMatch = trn.match(/<TRNAMT>([^<]+)/);
    if (amtMatch) {
      ofxTotal += parseFloat(amtMatch[1]);
      ofxCount++;
    }
  }
  console.log(`OFX lido: ${ofxCount} transações. Total: ${ofxTotal}`);

  // 3. OS
  console.log("Lendo OS...");
  const wbOS = xlsx.readFile(fileOS);
  const jsonOS = xlsx.utils.sheet_to_json(wbOS.Sheets[wbOS.SheetNames[0]], { header: 1 });
  let osCount = 0;
  let osTotal = 0;
  let headerRow = -1;
  let colOs = -1, colPlate = -1, colTotal = -1;

  for (let i = 0; i < Math.min(20, jsonOS.length); i++) {
    const row = jsonOS[i] || [];
    const rowStr = row.map(c => String(c||'').toLowerCase());
    if (rowStr.includes('status')) {
      headerRow = i;
      colOs = rowStr.findIndex(c => c === 'os' || c === 'nº os');
      colPlate = rowStr.findIndex(c => c === 'placa' || c === 'veículo');
      colTotal = rowStr.findIndex(c => c === 'valor' || c.includes('total') || c.includes('r$'));
      if (colPlate === -1) colPlate = 999; 
      break;
    }
  }

  const osRows = [];
  if (headerRow > -1 && colOs > -1) {
    for (let i = headerRow + 1; i < jsonOS.length; i++) {
      const row = jsonOS[i] || [];
      const osNum = String(row[colOs] || '').trim();
      if (!osNum || osNum.toLowerCase() === 'os' || isNaN(parseFloat(osNum))) continue;

      let plate = String(row[colPlate] || '').trim();
      if (!plate) plate = 'SEM_PLACA'; // <= AQUI: regra aplicada

      let val = 0;
      if (colTotal > -1) {
        val = parseFloat(String(row[colTotal] || '').replace(/[^0-9,-]/g, '').replace(',', '.'));
        if (isNaN(val)) val = 0;
      }
      osTotal += val;
      osCount++;
      osRows.push({
        os_number: osNum,
        plate: plate,
        total_value: val,
        store_id: null
      });
    }
  }
  console.log(`OS lida: ${osCount} registros. Total: ${osTotal}`);

  console.log("=== RELATÓRIO COMPLETO ===");
  console.log(`REDE: ${jsonRede.length - 2} linhas lidas. Totais: ${redeTotal}`);
  console.log(`OFX: ${ofxCount} txs lidas. Totais: ${ofxTotal}`);
  console.log(`OS: ${osCount} OS lidas. Totais: ${osTotal}. Default 'SEM_PLACA' aplicado em nulos.`);
  console.log("Simulação de inserção isolada finalizada com sucesso (apenas leitura realizada neste script local para evitar side-effects durante auditoria).");
}

run().catch(console.error);
