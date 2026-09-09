const fs = require('fs');
const path = require('path');
require('dotenv').config();

const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '../supabase/migrations/20260909000040_fix_raiox_restore_dinheiro_rede.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function runSql(querySql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: querySql })
  });

  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
  return { status: response.status, text };
}

async function main() {
  console.log('--- Applying Migration 20260909000040_fix_raiox_restore_dinheiro_rede.sql ---');
  const res = await runSql(sql);
  if (res.status !== 200 && res.status !== 201) {
    console.error('Migration failed!');
    process.exit(1);
  }
  console.log('Migration applied successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
