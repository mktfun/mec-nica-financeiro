const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const sql = fs.readFileSync('supabase/migrations/20260824000008_fix_contas_duplication_and_file_sources_reconciliation.sql', 'utf8');
  console.log('Applying migration 20260824000008...');

  const token = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF || (process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]);

  console.log('Project Ref:', projectRef);

  const res = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/`, {
    headers: {
      apikey: token,
      Authorization: `Bearer ${token}`
    }
  });

  // Execute SQL using pg or Supabase sql endpoint
  // Let's use postgres connection or rpc
  const sqlEndpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const pToken = process.env.SUPABASE_ACCESS_TOKEN || token;

  const resp = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (resp.ok) {
    console.log('✅ Migration applied via Management API successfully!');
  } else {
    console.log('API response status:', resp.status, await resp.text());
  }

  // Let's test the RPC directly
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' });
  if (rpcError) {
    console.error('RPC test error:', rpcError);
  } else {
    console.log('RPC test success:');
    console.log('  contas_base:', rpcData.contas_base);
    console.log('  contas_extras:', rpcData.contas_extras);
    console.log('  contas_manual:', rpcData.contas_manual);
    console.log('  diferenca_final:', rpcData.diferenca_final);
    console.log('  status_geral:', rpcData.status_geral);
  }
}
run();
