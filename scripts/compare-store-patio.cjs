const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const excelTotals = {
  'st-06': { name: 'Planalto', total: 27743.80 },
  'st-05': { name: 'Piraporinha', total: 2820.00 },
  '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f': { name: 'Mauá', total: 8783.84 },
  'st-04': { name: 'Kennedy', total: 2076.80 },
  'st-07': { name: 'Rudge Ramos', total: 9890.50 },
  'st-08': { name: 'Santo André', total: 9218.73 },
  'st-09': { name: 'Rei do Módulo', total: 11170.00 },
  'st-03': { name: 'Jorge Beretta', total: 3515.12 },
  'st-01': { name: 'Dom Pedro I', total: 6954.00 },
  'st-02': { name: 'Jabaquara', total: 6039.60 }
};

async function main() {
  const { data } = await s.from('patio_os')
    .select('store_id, total_value, paid_value, status, os_number')
    .lte('opened_at', '2026-08-24T23:59:59')
    .not('status', 'in', '("finalizada","finalizado","paga","pago","cancelada","cancelado")');

  const storeSums = {};
  (data || []).forEach(d => {
    const saldo = Math.max(0, Number(d.total_value || 0) - Number(d.paid_value || 0));
    storeSums[d.store_id] = (storeSums[d.store_id] || 0) + saldo;
    console.log(`OS Aberta: ${d.store_id} | OS #${d.os_number.padEnd(8)} | Saldo: R$ ${saldo.toFixed(2)} | Status: ${d.status}`);
  });

  console.log('\n--- SOMA POR LOJA NO DB vs EXCEL ---');
  let totalDb = 0;
  for (const [st, info] of Object.entries(excelTotals)) {
    const act = storeSums[st] || 0;
    totalDb += act;
    console.log(`Loja: ${info.name.padEnd(16)} (${st}) | DB: R$ ${act.toFixed(2).padStart(10)} | Excel: R$ ${info.total.toFixed(2).padStart(10)} | Diff: R$ ${(act - info.total).toFixed(2)}`);
  }
  console.log('\nTotal Pátio DB:', totalDb.toFixed(2), '| Total Excel: 88212.39');
}
main();
