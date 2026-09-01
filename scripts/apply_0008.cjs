const fs = require('fs');
require('dotenv').config();
const sql = fs.readFileSync('supabase/migrations/20260901000008_fix_nulls_and_revert_diferenca.sql', 'utf-8');
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
  } else {
     console.log('Migration Applied Successfully via Management API!');
  }
}).catch(console.error);
