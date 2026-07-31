import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

async function run() {
  console.log('Inserindo credenciais de teste...');
  
  const creds = [
    { portal: 'oficina_inteligente', portal_label: 'Oficina Inteligente', username: 'test_oi', password: '123', url: 'https://app.oficinainteligente.com.br' },
    { portal: 'rede', portal_label: 'Portal Rede', username: 'test_rede', password: '123', url: 'https://www.userede.com.br' }
  ];

  for (const cred of creds) {
    const { error } = await supabase.from('bot_credentials').upsert(cred, { onConflict: 'portal' });
    if (error) {
      console.error(`Erro ao inserir ${cred.portal}:`, error);
    } else {
      console.log(`Credencial para ${cred.portal} inserida com sucesso.`);
    }
  }
}

run();
