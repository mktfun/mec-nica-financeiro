const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPosCheck() {
  const { data: cols } = await supabase.from('pos_transactions').select('payment_method, machine_name, transaction_type').limit(10);
  console.log('Exemplos de pos_transactions:', cols);
}

checkPosCheck();
