const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const storeId = 'st-06'; // Planalto

  const { data: allPatio, error } = await s.from('patio_os')
    .select('id, os_number, plate, total_value, paid_value, pix_transfer_value, payment_method, status, last_payment_date, opened_at, closed_at')
    .eq('store_id', storeId);

  if (error) {
    console.error('Patio error:', error);
  } else {
    console.log('Total patio_os Planalto:', allPatio?.length);
    console.log('Sample os:', allPatio?.slice(0, 5));
  }
}
main();
