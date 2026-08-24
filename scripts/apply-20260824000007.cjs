const fs = require('fs');
const path = require('path');
require('dotenv').config();

const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';
const token = process.env.SUPABASE_ACCESS_TOKEN;

const sqlPath = path.join(__dirname, '../supabase/migrations/20260824000007_fix_store_previsto_and_unjustified_diff.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function main() {
  console.log('--- Applying Migration 20260824000007_fix_store_previsto_and_unjustified_diff.sql ---');
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
}
main();
