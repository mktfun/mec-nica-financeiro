const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://cnwzsvowkfymtdiryhqc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1MzcwOCwiZXhwIjoyMDk1NjI5NzA4fQ.IIkBHI70sazbBgrg22ddFujEYJKX8PYWGn3kHbou7Ps');

async function run() {
  console.log('=== RECONCILIATIONS (19/08) ===');
  const { data: recons } = await sb.from('reconciliations').select('store_id, date, na_loja_os, bank_total').eq('date', '2026-08-19');
  let sumNaLoja = 0;
  let sumBank = 0;
  recons?.forEach(r => {
    console.log(`Store ${r.store_id}: na_loja_os=${r.na_loja_os}, bank_total=${r.bank_total}`);
    sumNaLoja += Number(r.na_loja_os || 0);
    sumBank += Number(r.bank_total || 0);
  });
  console.log(`Total na_loja_os in reconciliations: ${sumNaLoja}`);
  console.log(`Total bank_total in reconciliations: ${sumBank}`);

  console.log('\n=== PATIO_OS STATS ===');
  const { data: patio, error } = await sb.from('patio_os').select('id, os_number, store_id, store_name, total_value, paid_value, status, opened_at, closed_at, last_payment_date');
  if (error) console.error(error);
  console.log('Total patio_os rows:', patio?.length);

  const byStore = {};
  patio?.forEach(p => {
    const val = Number(p.total_value || 0) - Number(p.paid_value || 0);
    byStore[p.store_id] = (byStore[p.store_id] || 0) + val;
  });
  console.log('Patio sum (total - paid) by store:', byStore);
  console.log('Total sum patio (all):', Object.values(byStore).reduce((a,b)=>a+b, 0));

  // Check patio_os filtered by opened_at <= 2026-08-19
  const patio19 = patio?.filter(p => {
    const d = (p.opened_at || '').substring(0, 10);
    return d <= '2026-08-19' && !['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes((p.status||'').toLowerCase());
  });
  console.log('Total open patio_os on/before 19/08:', patio19?.length);
  const sum19 = patio19?.reduce((acc, p) => acc + (Number(p.total_value || 0) - Number(p.paid_value || 0)), 0);
  console.log('Sum open patio_os on/before 19/08:', sum19);

  // Check daily_snapshots for 2026-08-19
  const { data: snap19 } = await sb.from('daily_snapshots').select('*').eq('date', '2026-08-19').single();
  console.log('\n=== DAILY SNAPSHOT 19/08 ===', snap19);
}

run().catch(console.error);
