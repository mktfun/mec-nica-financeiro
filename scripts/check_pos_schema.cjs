require('dotenv').config();

async function check() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = 'cnwzsvowkfymtdiryhqc';
  const query = `
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'pos_transactions'::regclass;
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  console.log('Constraints on pos_transactions:', await res.json());

  const colQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'pos_transactions';
  `;
  const colRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: colQuery })
  });
  console.log('Columns of pos_transactions:', await colRes.json());
}
check();
