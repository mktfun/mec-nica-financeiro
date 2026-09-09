const fs = require('fs');
const path = require('path');
require('dotenv').config();

const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';
const token = process.env.SUPABASE_ACCESS_TOKEN;

const sqlPath = path.join(__dirname, '../supabase/migrations/20260909000043_harden_rls_financial_tables.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function runSql(querySql) {
  if (!token) {
    console.warn('SUPABASE_ACCESS_TOKEN not set.');
    return { status: 401, text: 'No token' };
  }
  try {
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
    return { status: response.status, text };
  } catch (err) {
    console.error('Fetch error:', err.message);
    return { status: 500, text: err.message };
  }
}

async function main() {
  console.log('--- Applying Migration 20260909000043_harden_rls_financial_tables.sql ---');
  const res = await runSql(sql);
  if (res.status === 200 || res.status === 201) {
    console.log('Migration applied successfully via Supabase Management API!');
  } else {
    console.log('API response:', res.status, res.text);
  }
}

main().catch(console.error);
