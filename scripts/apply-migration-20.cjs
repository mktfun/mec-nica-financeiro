const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

async function applyMigration() {
  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20260902000020_create_batch_upsert_patio_os.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log(`Aplicando Migration 20 no projeto: ${projectRef}...`);

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
    console.error('Erro ao aplicar migration 20:', errText);
  } else {
    console.log('✅ Migration 20 aplicada com sucesso no Supabase!');
  }
}

applyMigration().catch(console.error);
