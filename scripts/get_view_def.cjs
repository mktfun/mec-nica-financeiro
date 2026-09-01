require('dotenv').config();

async function getDef() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = 'cnwzsvowkfymtdiryhqc';
  const query = `SELECT pg_get_viewdef('transactions'::regclass, true);`;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  console.log('VIEW transactions definition:\n', (await res.json())[0]?.pg_get_viewdef);
}
getDef();
