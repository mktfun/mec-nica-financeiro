const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectFreshState() {
  console.log('=== 1. DAILY SNAPSHOT DE 2026-08-24 ===');
  const { data: snap } = await s.from('daily_snapshots').select('*').eq('date', '2026-08-24').maybeSingle();
  console.log('Snapshot:', snap);

  console.log('\n=== 2. DAILY MANUAL BILLS DE 2026-08-24 ===');
  const { data: bills } = await s.from('daily_manual_bills').select('*').eq('date', '2026-08-24');
  console.log(`Total Bills: ${bills ? bills.length : 0} | Sum: R$ ${(bills || []).reduce((a, b) => a + Number(b.amount || 0), 0).toFixed(2)}`);
  (bills || []).forEach(b => {
    if (b.title.toUpperCase().includes('DANIEL') || b.amount > 5000) {
      console.log(`  Bill: ${b.title} | R$ ${b.amount} | Store: ${b.store_id}`);
    }
  });

  console.log('\n=== 3. POS TRANSACTIONS DE 2026-08-24 ===');
  const { data: pos } = await s.from('pos_transactions').select('*').eq('target_date', '2026-08-24');
  console.log(`Total POS: ${pos ? pos.length : 0}`);
  const storePos = {};
  (pos || []).forEach(p => {
    storePos[p.store_id] = (storePos[p.store_id] || 0) + Number(p.net_amount || 0);
  });
  console.log('POS Liquido por Loja:', storePos);

  console.log('\n=== 4. STORE CASH VAULT DE 2026-08-24 ===');
  const { data: vault } = await s.from('store_cash_vault').select('*');
  console.log(`Total Vault Rows: ${vault ? vault.length : 0}`);
  (vault || []).forEach(v => {
    console.log(`  Vault: ${v.description} | R$ ${v.amount} | Status: ${v.status} | Date: ${v.entry_date}`);
  });

  console.log('\n=== 5. PATIO OS DE 2026-08-24 ===');
  const { data: patio } = await s.from('patio_os').select('*').lte('opened_at', '2026-08-24T23:59:59');
  const openPatio = (patio || []).filter(p => !['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes((p.status || '').toLowerCase()));
  const openSum = openPatio.reduce((a, b) => a + (Number(b.total_value || 0) - Number(b.paid_value || 0)), 0);
  console.log(`Total Open OSs: ${openPatio.length} | Sum: R$ ${openSum.toFixed(2)}`);

  console.log('\n=== 6. RECONCILIATIONS DE 2026-08-24 ===');
  const { data: recons } = await s.from('reconciliations').select('store_id, bank_total, na_loja_os').eq('date', '2026-08-24');
  console.log('Reconciliations:', recons);
}
inspectFreshState();
