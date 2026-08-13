const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cnwzsvowkfymtdiryhqc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q');

async function run() {
  console.log("Starting...");
  const res = await supabase.rpc('process_marco_zero_import', {
    p_target_date: '2026-08-12',
    p_global: {},
    p_stores: [
      {
        store_id: 'st-01',
        store_name: 'Loja 1',
        saldoLoja: 100,
        osPendentes: [
          {
            numero_os: '12345',
            valor_os: 50
          }
        ]
      }
    ]
  });
  console.log('RESULT:', JSON.stringify(res, null, 2));
}
run();
