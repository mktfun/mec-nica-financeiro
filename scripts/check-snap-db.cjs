const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSnap() {
  const { data: snap } = await supabase.from('daily_snapshots').select('*').eq('date', '2026-09-02');
  console.log('Snapshots count:', snap?.length);
  if (snap?.length > 0) {
    console.log(JSON.stringify(snap[0], null, 2));
  }
}

checkSnap();
