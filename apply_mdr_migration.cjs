const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const SUPABASE_URL = "https://cnwzsvowkfymtdiryhqc.supabase.co";
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function applySql() {
  const sql = fs.readFileSync('supabase/migrations/20260817100000_create_mdr_contracts_and_audit_rpc.sql', 'utf8');

  // Supabase postgres direct via pg or RPC
  // Test running RPC directly
  console.log('Testando chamada get_mdr_audit_summary...');
  const { data, error } = await supabase.rpc('get_mdr_audit_summary', {
    p_store_id: null,
    p_start_date: '2026-08-13',
    p_end_date: '2026-08-14'
  });

  if (error) {
    console.log('RPC ainda não criada no banco remoto, executando via raw SQL se houver suporte ou fallback...');
    console.error(error.message);
  } else {
    console.log('RPC executada com sucesso:', JSON.stringify(data, null, 2));
  }
}

applySql();
