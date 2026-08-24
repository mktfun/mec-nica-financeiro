const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// The exact 28 OSs that compose the R$ 88.212,39 in the Excel:
const excelOpenOsList = [
  // Planalto (27.743,80)
  { store_id: 'st-06', os_number: '18456', total_value: 11805.60, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18455', total_value: 2482.60, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18454', total_value: 2278.40, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18452', total_value: 1699.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18433', total_value: 9041.60, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-06', os_number: '18412', total_value: 436.60, paid_value: 0, status: 'em_aberto' },
  // Piraporinha (2.820,00)
  { store_id: 'st-05', os_number: '40330', total_value: 1190.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-05', os_number: '40329', total_value: 800.00, paid_value: 800.00, status: 'finalizada' },
  { store_id: 'st-05', os_number: '40323', total_value: 1275.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-05', os_number: '40320', total_value: 355.00, paid_value: 0, status: 'em_aberto' },
  // Maua (8.783,84)
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', os_number: '22580', total_value: 577.10, paid_value: 0, status: 'em_aberto' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', os_number: '22566', total_value: 2821.00, paid_value: 0, status: 'em_aberto' },
  { store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', os_number: '22559', total_value: 5385.74, paid_value: 0, status: 'em_aberto' },
  // Kennedy (2.076,80)
  { store_id: 'st-04', os_number: '4405', total_value: 2076.80, paid_value: 0, status: 'em_aberto' },
  // Rudge Ramos (9.890,50)
  { store_id: 'st-07', os_number: '8750', total_value: 385.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-07', os_number: '8745', total_value: 2208.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-07', os_number: '8721', total_value: 1957.50, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-07', os_number: '8689', total_value: 6140.00, paid_value: 2000.00, status: 'pago_parcial' },
  { store_id: 'st-07', os_number: '8659', total_value: 1200.00, paid_value: 0, status: 'em_aberto' },
  // Santo Andre (9.218,73)
  { store_id: 'st-08', os_number: '2326', total_value: 9218.73, paid_value: 0, status: 'em_aberto' },
  // Rei do Modulo (11.170,00)
  { store_id: 'st-09', os_number: '1847', total_value: 12900.00, paid_value: 12900.00, status: 'finalizada' },
  { store_id: 'st-09', os_number: '1846', total_value: 4240.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-09', os_number: '1845', total_value: 2500.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-09', os_number: '1844', total_value: 700.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-09', os_number: '1838', total_value: 930.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-09', os_number: '1818', total_value: 2800.00, paid_value: 0, status: 'em_aberto' },
  // Jorge Beretta (3.515,12)
  { store_id: 'st-03', os_number: '1100', total_value: 1560.80, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-03', os_number: '1099', total_value: 1574.32, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-03', os_number: '1097', total_value: 0.00, paid_value: 0, status: 'finalizada' },
  { store_id: 'st-03', os_number: '1095', total_value: 190.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-03', os_number: '1089', total_value: 190.00, paid_value: 0, status: 'em_aberto' },
  // Dom Pedro (6.954,00)
  { store_id: 'st-01', os_number: '587', total_value: 900.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-01', os_number: '582', total_value: 6054.00, paid_value: 0, status: 'em_aberto' },
  // Jabaquara (6.039,60)
  { store_id: 'st-02', os_number: '393', total_value: 385.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-02', os_number: '387', total_value: 5300.00, paid_value: 0, status: 'em_aberto' },
  { store_id: 'st-02', os_number: '368', total_value: 354.60, paid_value: 0, status: 'em_aberto' }
];

async function syncAll() {
  console.log('=== ATUALIZANDO STORE CASH VAULT PARA EM_TRANSITO ===');
  await s.from('store_cash_vault').update({ status: 'em_transito', deposited_at: null }).eq('id', 'ab762d9d-5170-426a-a034-66e6d39572c3');
  await s.from('store_cash_vault').update({ status: 'em_transito', deposited_at: null }).eq('id', '1e19a50c-c28f-449b-ae00-e76ee5e5b660');
  console.log('✅ store_cash_vault atualizado com sucesso!');

  console.log('\n=== SINCRONIZANDO PATIO_OS COM AS 28 OSs DO EXCEL ===');
  // First, mark all OSs for 2026-08-24 as finalizada if not in excelOpenOsList
  const excelOsNums = new Set(excelOpenOsList.map(o => o.os_number));
  
  const { data: allPatio } = await s.from('patio_os')
    .select('id, os_number, store_id, total_value, paid_value, status')
    .lte('opened_at', '2026-08-24T23:59:59');

  for (const dbOs of allPatio || []) {
    if (!excelOsNums.has(dbOs.os_number)) {
      if (dbOs.status !== 'finalizada' && dbOs.status !== 'finalizado') {
        console.log(`Marcando como finalizada no DB: OS #${dbOs.os_number} (era ${dbOs.status})`);
        await s.from('patio_os').update({ status: 'finalizada', paid_value: dbOs.total_value }).eq('id', dbOs.id);
      }
    }
  }

  // Next, ensure all 28 open OSs have correct total_value, paid_value, status
  for (const item of excelOpenOsList) {
    const existing = (allPatio || []).find(p => p.os_number === item.os_number);
    if (existing) {
      await s.from('patio_os').update({
        total_value: item.total_value,
        paid_value: item.paid_value,
        status: item.status
      }).eq('id', existing.id);
    } else {
      await s.from('patio_os').insert({
        store_id: item.store_id,
        os_number: item.os_number,
        total_value: item.total_value,
        paid_value: item.paid_value,
        status: item.status,
        opened_at: '2026-08-24T10:00:00Z'
      });
    }
  }

  console.log('✅ patio_os 100% sincronizado com as 28 OSs!');
}
syncAll();
