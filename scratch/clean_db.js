import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanAll() {
  console.log('Autenticando...');
  // Tenta logar para ter permissões
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'admin'
  });
  if(authErr) {
    console.error('Auth error:', authErr.message);
    // Continua mesmo assim caso as politicas permitam delete
  } else {
    console.log('Logado com admin@admin.com');
  }

  console.log('Apagando transactions...');
  const { error: e1 } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('transactions:', e1 ? e1.message : 'ok');

  console.log('Apagando reconciliations...');
  const { error: e2 } = await supabase.from('reconciliations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('reconciliations:', e2 ? e2.message : 'ok');

  console.log('Apagando import_batches...');
  const { error: e3 } = await supabase.from('import_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('import_batches:', e3 ? e3.message : 'ok');

  console.log('Apagando patio_os...');
  const { error: e4 } = await supabase.from('patio_os').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('patio_os:', e4 ? e4.message : 'ok');
}

cleanAll();
