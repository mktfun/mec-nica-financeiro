const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

async function applyMigration10() {
  const sql = fs.readFileSync('supabase/migrations/20260824000010_drop_overloaded_rpc_and_fix_canonical_reconciliation.sql', 'utf8');
  console.log('Aplicando migração 20260824000010...');

  const projectRef = process.env.SUPABASE_PROJECT_REF || (process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]);
  const sqlEndpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const resp = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (resp.ok) {
    console.log('✅ Migração 10 aplicada com sucesso via Management API!');
  } else {
    console.log('API response status:', resp.status, await resp.text());
  }
}
applyMigration10();
