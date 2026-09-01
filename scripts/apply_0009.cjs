const fs = require('fs');
require('dotenv').config();
const sql = fs.readFileSync('supabase/migrations/20260901000009_fix_store_difference_and_ofx_pendencias.sql', 'utf-8');
const projectRef = 'cnwzsvowkfymtdiryhqc';
const token = process.env.SUPABASE_ACCESS_TOKEN;

fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
}).then(async r => {
  if (!r.ok) {
     console.error("HTTP ERROR:", await r.text());
     process.exit(1);
  } else {
     console.log('Migration 20260901000009 Applied Successfully via Management API!');
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});
