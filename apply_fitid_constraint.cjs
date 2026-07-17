const ACCESS_TOKEN = 'YOUR_TOKEN';

const sql = `
-- Drop the index if it exists to avoid conflicts
DROP INDEX IF EXISTS idx_transactions_fitid;

-- Add the unique constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_fitid_key;
ALTER TABLE transactions ADD CONSTRAINT transactions_fitid_key UNIQUE (fitid);
`;

async function run() {
  console.log('Applying UNIQUE CONSTRAINT migration for fitid...');
  const resp = await fetch('https://api.supabase.com/v1/projects/cnwzsvowkfymtdiryhqc/database/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await resp.text();
  console.log('Status:', resp.status);
  console.log('Response:', text.substring(0, 1000));
}

run().catch(console.error);
