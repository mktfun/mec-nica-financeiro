const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanDuplicates() {
  const { data: rows } = await supabase
    .from('patio_os')
    .select('id, os_number, store_id, store_name, total_value, paid_value, status');

  const CORRECT_STORE = {
    '403': 'st-02',
    '401': 'st-02',
    '368': 'st-02',
    '2415': 'st-08',
    '2414': 'st-08',
    '2416': 'st-08',
    '2405': 'st-08',
    '8769': 'st-07',
    '8768': 'st-07',
    '8689': 'st-07',
    '8763': 'st-07',
    '8762': 'st-07',
    '8766': 'st-07',
    '1858': 'st-09',
    '1856': 'st-09',
    '1818': 'st-09',
    '40342': 'st-05',
    '40337': 'st-05',
    '601': 'st-01',
    '596': 'st-01',
    '22596': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
    '22595': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
    '22594': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
    '1104': 'st-03',
    '18461': 'st-06'
  };

  const toDelete = [];
  (rows || []).forEach(r => {
    const osNum = String(r.os_number);
    if (CORRECT_STORE[osNum] && CORRECT_STORE[osNum] !== r.store_id) {
      toDelete.push(r);
    }
  });

  console.log('Removendo ' + toDelete.length + ' OSs salvas em filiais incorretas durante o OCR:');
  for (const del of toDelete) {
    console.log('   🗑️ Deletando OS #' + del.os_number + ' de ' + del.store_name);
    await supabase.from('patio_os').delete().eq('id', del.id);
  }

  // Recalcular Pátio Limpo
  const { data: cleanRows } = await supabase
    .from('patio_os')
    .select('store_id, store_name, os_number, total_value, paid_value')
    .in('status', ['em_aberto', 'pago_parcial']);

  const byStore = {};
  let totalPatio = 0;
  for (const r of cleanRows || []) {
    const pend = Math.max(0, (r.total_value || 0) - (r.paid_value || 0));
    if (pend > 0.05) {
      if (!byStore[r.store_name]) byStore[r.store_name] = 0;
      byStore[r.store_name] += pend;
      totalPatio += pend;
    }
  }

  console.log('\n📊 PÁTIO 100% LIMPO E CONSOLIDADO:');
  for (const [st, val] of Object.entries(byStore)) {
    console.log(`- ${st.padEnd(25, ' ')}: R$ ${val.toFixed(2).padStart(9, ' ')}`);
  }
  console.log('------------------------------------------------------------');
  console.log(`🎯 TOTAL PÁTIO OFICIAL: R$ ${totalPatio.toFixed(2)}`);

  const STORE_IDS = {
    'Dom Pedro - DP': 'st-01',
    'Jabaquara - JAB': 'st-02',
    'Jorge Beretta - DHJV': 'st-03',
    'Kennedy - MP': 'st-04',
    'Piraporinha - EMPORIO': 'st-05',
    'Planalto - BRASICAR': 'st-06',
    'Rudge Ramos - CAP': 'st-07',
    'Santo André - HD': 'st-08',
    'Rei do Módulo - MP': 'st-09',
    'Maua - MHE': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'
  };

  for (const [name, sid] of Object.entries(STORE_IDS)) {
    const storePatio = byStore[name] || 0;
    await supabase.from('reconciliations').update({ na_loja_os: storePatio }).eq('store_id', sid).eq('date', '2026-09-03');
  }
}

cleanDuplicates().catch(console.error);
