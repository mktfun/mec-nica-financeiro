const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectVault() {
  const { data: vault } = await s.from('store_cash_vault').select('*');
  console.log('store_cash_vault rows:', vault);
}
inspectVault();
