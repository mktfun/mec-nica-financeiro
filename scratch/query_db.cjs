const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Querying transactions...');
  const { data: txs, error: txError } = await supabase.from('transactions').select('*').eq('source', 'ofx').limit(5);
  console.log('OFX Txs:', txs?.length, txError);
  if (txs?.length) console.log('Sample OFX:', txs[0]);
  
  console.log('Querying all transactions by source...');
  const { data: allTxs, error: allError } = await supabase.from('transactions').select('source, target_date, store_id, amount');
  
  if (allTxs) {
    const counts = allTxs.reduce((acc, tx) => {
      acc[tx.source] = (acc[tx.source] || 0) + 1;
      return acc;
    }, {});
    console.log('Transaction counts by source:', counts);
  }

  const { data: recs, error: recError } = await supabase.from('reconciliations').select('*').limit(5);
  console.log('Reconciliations:', recs?.length, recError);
  if (recs?.length) console.log('Sample Rec:', recs[0]);
}
run();
