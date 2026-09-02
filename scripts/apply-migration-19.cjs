const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

async function applyMigration() {
  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20260901000019_sync_3108_and_closed_snapshot_status.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log(`Aplicando Migration 19 no projeto: ${projectRef}...`);

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Erro ao aplicar migration 19:', errText);
  } else {
    console.log('✅ Migration 19 aplicada com sucesso no Supabase!');
  }
}

applyMigration();
