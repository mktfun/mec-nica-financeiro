const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const content = fs.readFileSync('.env', 'utf8');
const env = {};
content.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('--- Inspecionando daily_revenue_adjustments ---');
  const { data: revAdj, error: revErr } = await supabase.from('daily_revenue_adjustments').select('*').limit(10);
  console.log('Rev adjustments error:', revErr);
  console.log('Rev adjustments rows:', revAdj);

  console.log('--- Inspecionando ofx_transactions com manual_category recentes ---');
  const { data: ofxJust, error: ofxErr } = await supabase
    .from('ofx_transactions')
    .select('id, date, target_date, amount, type, description, manual_category, manual_justification')
    .not('manual_category', 'is', null)
    .order('target_date', { ascending: false })
    .limit(10);
  console.log('OFX just error:', ofxErr);
  console.log('OFX just rows:', ofxJust);
}
run();
