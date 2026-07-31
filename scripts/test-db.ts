import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { data, error } = await supabase.from('reconciliations').select('*').limit(20);
  console.log('RECONCILIATIONS:');
  console.log(data);
  
  const { data: stores, error: sError } = await supabase.from('stores').select('*');
  console.log('STORES:');
  console.log(stores);
}

run();
