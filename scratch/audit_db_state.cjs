const { createClient } = require('@supabase/supabase-js');

const url = 'https://cnwzsvowkfymtdiryhqc.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1MzcwOCwiZXhwIjoyMDk1NjI5NzA4fQ.IIkBHI70sazbBgrg22ddFujEYJKX8PYWGn3kHbou7Ps';

const sb = createClient(url, key);

async function run() {
  // 1. Check what dates exist in daily_snapshots
  console.log('=== 1. DAILY SNAPSHOTS (all) ===');
  const { data: snaps } = await sb.from('daily_snapshots').select('date, caixa_atual, saldo_bancario, dinheiro_mp, a_receber_manual, total_patio, contas_a_pagar, juros_rede, saldo_negativo_itau, faturamento, total_recebiveis, provisao').order('date');
  if (snaps) {
    snaps.forEach(s => {
      console.log(`Date: ${s.date} | Caixa: ${s.caixa_atual} | Saldo Bancos: ${s.saldo_bancario} | DinhMP: ${s.dinheiro_mp} | AReceber: ${s.a_receber_manual} | Patio: ${s.total_patio} | Contas: ${s.contas_a_pagar} | Juros: ${s.juros_rede} | Negativo: ${s.saldo_negativo_itau}`);
    });
  }

  // 2. Check RPC get_daily_reconciliation_summary for 2026-08-19
  console.log('\n=== 2. RPC get_daily_reconciliation_summary (19/08) ===');
  const { data: summary19, error: err19 } = await sb.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-19' });
  if (err19) console.log('ERROR:', err19);
  else console.log(JSON.stringify(summary19, null, 2));

  // 3. Check the patio_os for 19/08
  console.log('\n=== 3. PATIO_OS for 19/08 ===');
  const { data: patioData, error: patioErr } = await sb.from('patio_os').select('store_id, valor_restante, status').lte('opened_at', '2026-08-19T23:59:59').or('status.eq.aberta,closed_at.gt.2026-08-19T23:59:59');
  if (patioErr) console.log('ERROR patio:', patioErr);
  else {
    // Sum by store
    const byStore = {};
    patioData?.forEach(r => {
      if (!byStore[r.store_id]) byStore[r.store_id] = 0;
      byStore[r.store_id] += Number(r.valor_restante || 0);
    });
    console.log('Patio by store:', byStore);
    console.log('Total patio:', Object.values(byStore).reduce((a, b) => a + b, 0));
  }

  // 4. Check bank_accounts for saldo
  console.log('\n=== 4. BANK_ACCOUNTS ===');
  const { data: bankAccts } = await sb.from('bank_accounts').select('id, alias, store_id, balance, account_limit');
  if (bankAccts) {
    let totalBal = 0;
    bankAccts.forEach(a => {
      console.log(`  ${a.alias} (store: ${a.store_id}) | Bal: ${a.balance} | Limit: ${a.account_limit}`);
      totalBal += Number(a.balance || 0);
    });
    console.log(`  TOTAL balance: ${totalBal}`);
  }

  // 5. Check import_batches
  console.log('\n=== 5. IMPORT_BATCHES (last 5) ===');
  const { data: batches } = await sb.from('import_batches').select('id, target_date, source, file_count, created_at').order('created_at', { ascending: false }).limit(5);
  batches?.forEach(b => console.log(`  Date: ${b.target_date} | Src: ${b.source} | Files: ${b.file_count} | At: ${b.created_at}`));
}

run().catch(console.error);
