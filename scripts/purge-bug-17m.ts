import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Determine __dirname in ES module context if needed, but tsx usually handles both.
// To be safe with tsx and both commonjs/esm, we can just use process.cwd() since we run it from root.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '***' : undefined);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Deleting from reconciliations where date >= 2026-06-08...');
  const { data, error } = await supabase
    .from('reconciliations')
    .delete()
    .gte('date', '2026-06-08');

  if (error) {
    console.error('Error deleting data:', error);
    process.exit(1);
  } else {
    console.log('Successfully deleted the buggy reconciliation data.', data);
  }
}

run();
