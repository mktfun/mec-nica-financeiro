const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const k = line.substring(0, idx).trim();
    let v = line.substring(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.substring(1, v.length - 1);
    env[k] = v;
  }
});

const agentEnvFile = fs.existsSync('.agent/.env_agent') ? fs.readFileSync('.agent/.env_agent', 'utf8') : '';
agentEnvFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const k = line.substring(0, idx).trim();
    let v = line.substring(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.substring(1, v.length - 1);
    env[k] = v;
  }
});

const projectId = env.VITE_SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';
const accessToken = env.SUPABASE_ACCESS_TOKEN;

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const body = await res.json();
  if (body.message && body.message.includes('Failed to run sql')) {
    throw new Error(body.message);
  }
  return body;
}

async function applyCleanup() {
  console.log('1. Removing 4 orphan Marco Zero records with plate N/I in patio_os...');
  const delRes = await runSql(`
    DELETE FROM patio_os
    WHERE plate = 'N/I' AND raw_status IS NULL;
  `);
  console.log('Delete result:', delRes);

  console.log('\n2. Testing get_daily_reconciliation_summary for 2026-08-17...');
  const summaryRes = await runSql(`SELECT get_daily_reconciliation_summary('2026-08-17');`);
  const summary = summaryRes[0].get_daily_reconciliation_summary;

  console.log('Consolidated Summary:');
  console.log(`- Total Saldo Banco: R$ ${summary.total_saldo_banco}`);
  console.log(`- Total Na Loja OS: R$ ${summary.na_loja_os}`);
  console.log(`- Caixa Atual: R$ ${summary.caixa_atual}`);

  console.log('\nStore Na Loja OS breakdown:');
  summary.stores.forEach(s => {
    console.log(`  ${s.store_name.padEnd(25, ' ')}: Na Loja OS = R$ ${s.na_loja_os.toFixed(2)}`);
  });
}

applyCleanup().catch(console.error);
