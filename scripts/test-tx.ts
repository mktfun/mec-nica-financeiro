import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { data, error } = await supabase.from('transactions').select('*').limit(5);
  console.log('TRANSACTIONS:');
  console.log(data);
}

run();
