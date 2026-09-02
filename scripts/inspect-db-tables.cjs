const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectDb() {
  console.log('=== SNAPSHOTS in daily_snapshots ===');
  const { data: snaps } = await supabase.from('daily_snapshots').select('target_date, caixa_atual, caixa_anterior, faturamento, contas_a_pagar, diferenca_final, is_closed').order('target_date', { ascending: false }).limit(5);
  console.log(snaps);

  console.log('\n=== REVENUE ADJUSTMENTS for 2026-09-01 ===');
  const { data: revs } = await supabase.from('daily_revenue_adjustments').select('*').eq('target_date', '2026-09-01');
  console.log(revs);

  console.log('\n=== MANUAL BILLS for 2026-09-01 ===');
  const { data: bills } = await supabase.from('daily_manual_bills').select('*').eq('target_date', '2026-09-01');
  console.log(bills);

  console.log('\n=== PATIO OS for 2026-09-01 ===');
  const { data: osList } = await supabase.from('patio_os').select('store_id, os_number, total_value, paid_value, status, opened_at').gte('opened_at', '2026-09-01T00:00:00Z').lte('opened_at', '2026-09-01T23:59:59Z');
  console.log(`Total OSs hoje: ${osList.length}`);
  const openOs = osList.filter(o => o.status !== 'finalizada');
  console.log(`OSs em aberto hoje: ${openOs.length}, Total saldo aberto: ${openOs.reduce((s, o) => s + (o.total_value - o.paid_value), 0)}`);

  console.log('\n=== PATIO OS de todas as datas que não estão finalizadas ===');
  const { data: allOpenOs } = await supabase.from('patio_os').select('store_id, os_number, total_value, paid_value, status, opened_at').neq('status', 'finalizada');
  console.log(`Total OSs em aberto no banco: ${allOpenOs.length}, Total saldo: ${allOpenOs.reduce((s, o) => s + (o.total_value - o.paid_value), 0)}`);
}

inspectDb();
