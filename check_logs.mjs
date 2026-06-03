import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
supabase.from('import_logs').select('*').then(d => {
  console.log('Data:', d.data);
  console.log('Error:', d.error);
});
