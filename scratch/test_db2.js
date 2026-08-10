import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('source', 'ofx');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total OFX rows globally:', data.length);
  const outTxs = data.filter(d => d.type === 'out');
  console.log('Out transactions globally:', outTxs.length);
  if (outTxs.length > 0) {
    console.log('Sample OUT:', outTxs.slice(0, 5));
  }
}

run();
