const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listSnapshots() {
  const { data: snaps, error } = await supabase.from('daily_snapshots').select('date, caixa_atual, faturamento, is_closed').order('date', { ascending: false });
  console.log('Snapshots cadastrados:', snaps);
}

listSnapshots().catch(console.error);
