import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Or Service role if we have it. Anon might work if RLS allows it.
// Let's check RLS on stores table.

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) {
    console.error("Error fetching stores:", error);
    return;
  }
  
  for (const store of stores) {
    if (store.name.includes('') || store.name.includes('Mdulo')) {
      const fixedName = store.name.replace(//g, 'ó').replace(/M.dulo/g, 'Módulo');
      console.log(`Fixing store: ${store.name} -> ${fixedName}`);
      const { error: updateError } = await supabase
        .from('stores')
        .update({ name: fixedName })
        .eq('id', store.id);
      if (updateError) {
         console.error("Update error:", updateError);
      } else {
         console.log("Updated successfully!");
      }
    }
  }
}

run();
