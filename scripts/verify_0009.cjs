require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  const datesToTest = ['2026-09-01', '2026-08-24', '2026-08-17', '2026-08-31'];
  
  for (const d of datesToTest) {
    console.log(`Testing RPC for date: ${d}...`);
    const { data, error } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: d });
    if (error) {
      console.error(`❌ FAILED for ${d}:`, error);
      process.exit(1);
    } else {
      console.log(`✅ SUCCESS for ${d}: is_closed=${data.is_closed}, status_geral=${data.status_geral}, stores_count=${data.stores?.length || 0}, caixa_atual=${data.caixa_atual}, caixa_anterior=${data.caixa_anterior}`);
    }
  }
  console.log('🎉 ALL DATES PASSED VALIDATION WITHOUT ANY 42703 ERRORS!');
}

testRpc();
