const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSnap() {
  const { data: snap } = await supabase.from('daily_snapshots').select('*').eq('date', '2026-09-02').single();
  console.log('Snapshot de 02/09/2026:');
  console.log(JSON.stringify(snap, null, 2));
}

checkSnap();
