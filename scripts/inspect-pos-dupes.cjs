const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectPos() {
  const { data: pos } = await s.from('pos_transactions').select('*').eq('target_date', '2026-08-24');
  console.log('Total POS:', pos.length);

  const seen = new Map();
  const dupes = [];

  pos.forEach(p => {
    const key = `${p.store_id}_${p.gross_amount}_${p.net_amount}_${p.transaction_date || ''}`;
    if (seen.has(key)) {
      dupes.push(p);
      console.log('DUPLICATE POS FOUND:', p.id, key, p.net_amount);
    } else {
      seen.set(key, p);
    }
  });

  console.log('Total duplicates found:', dupes.length);
}
inspectPos();
