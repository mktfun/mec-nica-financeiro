const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://cnwzsvowkfymtdiryhqc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1MzcwOCwiZXhwIjoyMDk1NjI5NzA4fQ.IIkBHI70sazbBgrg22ddFujEYJKX8PYWGn3kHbou7Ps');

async function run() {
  console.log('=== PATIO_OS SAMPLE ===');
  const { data, error } = await sb.from('patio_os').select('*').limit(3);
  if (error) console.log('patio_os error:', error);
  else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    data.forEach(r => console.log(JSON.stringify(r, null, 2)));
  } else console.log('patio_os is EMPTY');

  console.log('\n=== DAILY_SNAPSHOTS ===');
  const { data: snaps } = await sb.from('daily_snapshots').select('*').order('date');
  if (snaps && snaps.length > 0) {
    console.log('Columns:', Object.keys(snaps[0]));
    snaps.forEach(s => console.log(JSON.stringify(s)));
  } else console.log('daily_snapshots EMPTY');

  console.log('\n=== STORES ===');
  const { data: stores } = await sb.from('stores').select('id, name, active').eq('active', true);
  stores?.forEach(s => console.log(`  ${s.id}: ${s.name}`));

  console.log('\n=== OFX COUNT BY DATE ===');
  const { data: ofxDates } = await sb.from('ofx_transactions').select('target_date').not('target_date', 'is', null);
  const dc = {};
  ofxDates?.forEach(r => { dc[r.target_date] = (dc[r.target_date] || 0) + 1; });
  console.log(dc);

  console.log('\n=== POS COUNT BY DATE ===');
  const { data: posDates } = await sb.from('pos_transactions').select('target_date').not('target_date', 'is', null);
  const pc = {};
  posDates?.forEach(r => { pc[r.target_date] = (pc[r.target_date] || 0) + 1; });
  console.log(pc);

  console.log('\n=== PATIO_OS RECENT ===');
  const { data: patioAll } = await sb.from('patio_os').select('*').order('opened_at', { ascending: false }).limit(5);
  patioAll?.forEach(p => console.log(JSON.stringify(p)));
  const { count } = await sb.from('patio_os').select('*', { count: 'exact', head: true });
  console.log('Total patio_os count:', count);

  console.log('\n=== RECONCILIATIONS ===');
  const { data: recons } = await sb.from('reconciliations').select('*').order('date', { ascending: false }).limit(5);
  recons?.forEach(r => console.log(JSON.stringify(r)));

  console.log('\n=== BANK_ACCOUNTS ===');
  const { data: ba } = await sb.from('bank_accounts').select('*');
  ba?.forEach(b => console.log(JSON.stringify(b)));
  console.log('Total:', ba?.length);
}

run().catch(console.error);
