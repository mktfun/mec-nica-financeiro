const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function compare() {
  console.log('=== COMPARAÇÃO DE SALDOS BANCÁRIOS ===');
  const wb = xlsx.readFile('C:\\Users\\admin\\Downloads\\CONCILIAÇÃO 0109.xlsx');
  
  // Saldos do Excel:
  const excelBancos = {
    'st-06': -10431.97, // Planalto
    'st-05': 8146.36,   // Piraporinha
    '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f': 11140.06, // Mauá
    'st-04': 94144.89,  // Kennedy
    'st-07': 9395.48,   // Rudge
    'st-08': 2163.30,   // Santo André
    'st-09': 7581.10,   // Rei do Módulo
    'st-03': 168216.80, // Jorge Beretta (CC 168.216,80)
    'st-01': 26122.27,  // Dom Pedro
    'st-02': 8991.14    // Jabaquara
  };

  const { data: dbRecons } = await supabase.from('reconciliations').select('store_id, bank_total, na_loja_os').eq('date', '2026-09-01');
  console.log('DB Reconciliations 01/09:');
  let sumPosExcel = 0;
  let sumPosDb = 0;

  for (const [sId, exVal] of Object.entries(excelBancos)) {
    const dbRow = dbRecons.find(r => r.store_id === sId);
    const dbVal = dbRow ? dbRow.bank_total : null;
    if (exVal > 0) sumPosExcel += exVal;
    if (dbVal > 0) sumPosDb += dbVal;
    console.log(`Loja ${sId}: Excel = ${exVal}, DB = ${dbVal}, Dif = ${(dbVal || 0) - exVal}`);
  }
  console.log(`Soma Positivos Excel: ${sumPosExcel}, Soma Positivos DB: ${sumPosDb}`);

  console.log('\n=== COMPARAÇÃO DE PÁTIO OS ===');
  const { data: dbOpenOs } = await supabase.from('patio_os')
    .select('store_id, os_number, total_value, paid_value, status, opened_at')
    .neq('status', 'finalizada');

  console.log(`Total OSs abertas no DB: ${dbOpenOs.length}`);
  const sumByStoreDb = {};
  dbOpenOs.forEach(o => {
    const val = (o.total_value || 0) - (o.paid_value || 0);
    sumByStoreDb[o.store_id] = (sumByStoreDb[o.store_id] || 0) + val;
  });
  console.log('Soma de Pátio por Loja no DB:', sumByStoreDb);
  console.log('Total Pátio DB:', Object.values(sumByStoreDb).reduce((a, b) => a + b, 0));
}

compare();
