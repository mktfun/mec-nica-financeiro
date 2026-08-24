const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('=== 1. STORE CASH VAULT (DINHEIRO NO COFRE) ===');
  const { data: vault, error: vErr } = await s.from('store_cash_vault').select('*');
  console.log('store_cash_vault rows:', vault);

  console.log('\n=== 2. TRIPLE RECONCILIATION (MAQUININHAS REDE) ===');
  const { data: triple, error: tErr } = await s.rpc('get_store_pos_triple_reconciliation', { p_date: '2026-08-24' });
  console.log('triple reconciliation result:', JSON.stringify(triple, null, 2));

  console.log('\n=== 3. POS TRANSACTIONS DO DIA 2026-08-24 ===');
  const { data: posTx, error: pErr } = await s.from('pos_transactions').select('*').eq('target_date', '2026-08-24');
  console.log(`Total POS Transactions: ${posTx ? posTx.length : 0}`);
  (posTx || []).forEach(t => {
    console.log(`  Store: ${t.store_id} | Net: R$ ${t.net_amount} | Gross: R$ ${t.gross_amount} | Status: ${t.status} | Type: ${t.transaction_type} | Card: ${t.card_brand}`);
  });

  console.log('\n=== 4. OFX TRANSACTIONS DO DIA 2026-08-24 (REDE IN) ===');
  const { data: ofxTx } = await s.from('ofx_transactions')
    .select('store_id, type, amount, counterpart_name, fitid, matched_os_number')
    .eq('target_date', '2026-08-24')
    .eq('type', 'in');
  
  (ofxTx || []).forEach(t => {
    if (t.counterpart_name?.toUpperCase().includes('REDE') || t.counterpart_name?.toUpperCase().includes('CART')) {
      console.log(`  OFX REDE: Store: ${t.store_id} | R$ ${t.amount} | Name: ${t.counterpart_name}`);
    }
  });
}
main();
