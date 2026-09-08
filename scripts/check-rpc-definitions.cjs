const fs = require('fs');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

async function checkRpc() {
  const query = `
    SELECT 
      conname, 
      pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    WHERE conrelid = 'daily_revenue_adjustments'::regclass;
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const data = await res.json();
  console.log(data);
}

checkRpc();
