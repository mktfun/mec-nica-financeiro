import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !key) {
  console.error('URL ou KEY não encontradas');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Iniciando Hard Reset (Transacional)...');
  
  const tables = [
    'transactions',
    'import_logs',
    'patio_os',
    'receivables',
    'reconciliations',
    'daily_snapshots'
  ];

  for (const table of tables) {
    console.log(`Limpando tabela: ${table}`);
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      console.error(`Erro ao limpar ${table}:`, error.message);
    } else {
      console.log(`✓ ${table} limpa com sucesso.`);
    }
  }

  console.log('Finalizado! A base de lojas e metas foi preservada.');
}

run();
