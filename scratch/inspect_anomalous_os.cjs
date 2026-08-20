const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://cnwzsvowkfymtdiryhqc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1MzcwOCwiZXhwIjoyMDk1NjI5NzA4fQ.IIkBHI70sazbBgrg22ddFujEYJKX8PYWGn3kHbou7Ps');

async function run() {
  const { data: patio } = await sb.from('patio_os').select('*').in('os_number', ['8659', '8689', '8721', '8732', '8733', '8736', '8737', '8738', '583', '1092']);
  console.log('Found patio_os rows for inspected numbers:');
  patio?.forEach(p => {
    console.log(`OS #${p.os_number} | Store: ${p.store_id} (${p.store_name}) | Total: ${p.total_value} | Paid: ${p.paid_value} | Status: ${p.status} | Opened: ${p.opened_at}`);
  });
}
run();
