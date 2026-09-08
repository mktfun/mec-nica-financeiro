const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAll() {
  console.log('=== ALL DAILY_SNAPSHOTS ===');
  const { data: snaps } = await supabase
    .from('daily_snapshots')
    .select('*')
    .order('date', { ascending: true });
  
  console.log(JSON.stringify(snaps, null, 2));

  console.log('=== RECONCILIATIONS 01/09 ===');
  const { data: recons } = await supabase
    .from('reconciliations')
    .select('*')
    .eq('date', '2026-09-01');
  console.log(JSON.stringify(recons, null, 2));
}

inspectAll().catch(console.error);
