const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

async function applyMigration() {
  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20260901000018_multi_days_benchmark_perfect_rpc.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log(`Aplicando Migration 18 no projeto: ${projectRef}...`);

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
    console.error('❌ Erro ao aplicar migration 18:', errText);
    process.exit(1);
  }

  const resJson = await response.json();
  console.log('✅ Migration 18 aplicada com sucesso!', resJson);
}

applyMigration();
