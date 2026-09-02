const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

async function check() {
  const sql = "SELECT id, store_id, os_number, client_name, plate, total_value, paid_value, status, raw_status, updated_at FROM patio_os WHERE os_number = '22593' ORDER BY updated_at DESC LIMIT 5;";

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const data = await response.json();
  console.log('Query result from PostgreSQL patio_os:', JSON.stringify(data, null, 2));
}

check();
