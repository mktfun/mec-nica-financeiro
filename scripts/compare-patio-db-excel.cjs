const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// The exact 28 OSs that compose the R$ 88.212,39 in the Excel:
const excelOpenOsList = [
  // Planalto (27.743,80)
  { store: 'Planalto', os_number: '18456', val: 11805.60 },
  { store: 'Planalto', os_number: '18455', val: 2482.60 },
  { store: 'Planalto', os_number: '18454', val: 2278.40 },
  { store: 'Planalto', os_number: '18452', val: 1699.00 },
  { store: 'Planalto', os_number: '18433', val: 9041.60 },
  { store: 'Planalto', os_number: '18412', val: 436.60 },
  // Piraporinha (2.820,00)
  { store: 'Piraporinha', os_number: '40330', val: 1190.00 },
  { store: 'Piraporinha', os_number: '40329', val: 0.00 },
  { store: 'Piraporinha', os_number: '40323', val: 1275.00 },
  { store: 'Piraporinha', os_number: '40320', val: 355.00 },
  // Maua (8.783,84)
  { store: 'Maua', os_number: '22580', val: 577.10 },
  { store: 'Maua', os_number: '22566', val: 2821.00 },
  { store: 'Maua', os_number: '22559', val: 5385.74 },
  // Kennedy (2.076,80)
  { store: 'Kennedy', os_number: '4405', val: 2076.80 },
  // Rudge Ramos (9.890,50)
  { store: 'Rudge Ramos', os_number: '8750', val: 385.00 },
  { store: 'Rudge Ramos', os_number: '8745', val: 2208.00 },
  { store: 'Rudge Ramos', os_number: '8721', val: 1957.50 },
  { store: 'Rudge Ramos', os_number: '8689', val: 4140.00 },
  { store: 'Rudge Ramos', os_number: '8659', val: 1200.00 },
  // Santo Andre (9.218,73)
  { store: 'Santo André', os_number: '2326', val: 9218.73 },
  // Rei do Modulo (11.170,00)
  { store: 'Rei do Módulo', os_number: '1847', val: 0.00 },
  { store: 'Rei do Módulo', os_number: '1846', val: 4240.00 },
  { store: 'Rei do Módulo', os_number: '1845', val: 2500.00 },
  { store: 'Rei do Módulo', os_number: '1844', val: 700.00 },
  { store: 'Rei do Módulo', os_number: '1838', val: 930.00 },
  { store: 'Rei do Módulo', os_number: '1818', val: 2800.00 },
  // Jorge Beretta (3.515,12)
  { store: 'Jorge Beretta', os_number: '1100', val: 1560.80 },
  { store: 'Jorge Beretta', os_number: '1099', val: 1574.32 },
  { store: 'Jorge Beretta', os_number: '1097', val: 0.00 },
  { store: 'Jorge Beretta', os_number: '1095', val: 190.00 },
  { store: 'Jorge Beretta', os_number: '1089', val: 190.00 },
  // Dom Pedro (6.954,00)
  { store: 'Dom Pedro', os_number: '587', val: 900.00 },
  { store: 'Dom Pedro', os_number: '582', val: 6054.00 },
  // Jabaquara (6.039,60)
  { store: 'Jabaquara', os_number: '393', val: 385.00 },
  { store: 'Jabaquara', os_number: '387', val: 5300.00 },
  { store: 'Jabaquara', os_number: '368', val: 354.60 },
];

async function main() {
  const { data: dbPatio } = await s.from('patio_os')
    .select('store_id, store_name, os_number, total_value, paid_value, status, opened_at')
    .lte('opened_at', '2026-08-24T23:59:59')
    .not('status', 'in', '("finalizada","finalizado","paga","pago","cancelada","cancelado")');

  console.log('=== OSs NO DB COM SALDO > 0 ===');
  let dbTotal = 0;
  const dbOsMap = new Map();
  (dbPatio || []).forEach(os => {
    const saldo = Math.max(0, Number(os.total_value || 0) - Number(os.paid_value || 0));
    if (saldo > 0) {
      dbTotal += saldo;
      dbOsMap.set(os.os_number, { ...os, saldo });
      console.log(`DB: OS #${os.os_number.padEnd(8)} | Loja: ${os.store_name?.padEnd(20)} | Saldo: R$ ${saldo.toFixed(2).padStart(10)} | Status: ${os.status}`);
    }
  });

  console.log(`\nTOTAL PÁTIO NO BANCO: R$ ${dbTotal.toFixed(2)}`);
  console.log(`TOTAL PÁTIO NO EXCEL: R$ 88.212,39`);
  console.log(`DIFERENÇA DB vs EXCEL: R$ ${(dbTotal - 88212.39).toFixed(2)}`);

  console.log('\n=== COMPARAÇÃO OS A OS ===');
  const excelSet = new Set(excelOpenOsList.map(e => e.os_number));
  
  // OSs que estão no DB mas NÃO deveriam estar no Pátio (ou com valor errado)
  for (const [osNum, dbItem] of dbOsMap.entries()) {
    const excelItem = excelOpenOsList.find(e => e.os_number === osNum);
    if (!excelItem) {
      console.log(`⚠️ OS NO DB MAS NÃO NO EXCEL: OS #${osNum} | Loja: ${dbItem.store_name} | Saldo DB: R$ ${dbItem.saldo.toFixed(2)}`);
    } else if (Math.abs(excelItem.val - dbItem.saldo) > 0.05) {
      console.log(`⚠️ VALOR DIVERGENTE: OS #${osNum} | Saldo DB: R$ ${dbItem.saldo.toFixed(2)} vs Excel: R$ ${excelItem.val.toFixed(2)}`);
    }
  }

  // OSs que estão no Excel mas estão faltando no DB
  excelOpenOsList.forEach(excelItem => {
    if (!dbOsMap.has(excelItem.os_number) && excelItem.val > 0) {
      console.log(`❌ OS FALTANDO NO DB: OS #${excelItem.os_number} (${excelItem.store}) | Esperado Excel: R$ ${excelItem.val.toFixed(2)}`);
    }
  });
}
main();
