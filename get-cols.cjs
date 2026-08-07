const fs = require('fs');
const path = require('path');
require('dotenv').config();

const projectRef = 'cnwzsvowkfymtdiryhqc';
const token = process.env.SUPABASE_ACCESS_TOKEN;

async function runSql(querySql) {
  const response = await fetch('https://api.supabase.com/v1/projects/' + projectRef + '/database/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: querySql })
  });

  const text = await response.text();
  console.log(text);
}

runSql(
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'patio_os'
);
