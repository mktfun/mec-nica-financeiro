const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration16() {
  const sql = fs.readFileSync('supabase/migrations/20260901000016_create_and_link_manual_os_rpc.sql', 'utf8');
  console.log('Aplicando migração 20260901000016_create_and_link_manual_os_rpc.sql...');

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
    console.log('✅ Migração 20260901000016 aplicada com sucesso via Management API!');
  } else {
    console.error('API response status:', resp.status, await resp.text());
    process.exit(1);
  }
}

applyMigration16();
