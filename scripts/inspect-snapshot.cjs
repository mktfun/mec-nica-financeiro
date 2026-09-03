const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspectSnapshot() {
  const { data: snap } = await supabase.from('daily_snapshots').select('*').eq('date', '2026-09-02').single();
  console.log('Snapshot 02/09:', snap);
  const { data: snap01 } = await supabase.from('daily_snapshots').select('*').eq('date', '2026-09-01').single();
  console.log('Snapshot 01/09:', snap01 ? { date: snap01.date, caixa_atual: snap01.caixa_atual, is_closed: snap01.is_closed } : null);
}

inspectSnapshot().catch(console.error);
