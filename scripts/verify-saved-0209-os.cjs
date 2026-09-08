const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSavedOs() {
  const { data: osList, error } = await supabase
    .from('patio_os')
    .select('store_id, store_name, os_number, plate, client_name, total_value, paid_value, status, payment_method, debit_value, credit_value, pix_transfer_value, cash_value, opened_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(35);

  if (error) console.error('Erro:', error);
  else {
    console.log(`Encontradas ${osList.length} OSs recentes:`);
    osList.forEach(o => {
      console.log(`- Loja: ${o.store_name} (${o.store_id}) | OS #${o.os_number} | Placa: ${o.plate} | Cliente: ${o.client_name} | Total: R$ ${o.total_value} | Pago: R$ ${o.paid_value} | Status: ${o.status}`);
    });
  }
}

checkSavedOs();
