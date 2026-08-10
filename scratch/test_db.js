import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const date = '2026-08-07';
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('target_date', date)
    .eq('source', 'ofx');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('All OFX transactions:', data);
}

run();
