import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials:", { supabaseUrl, supabaseKey: !!supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStores() {
  const { data: stores, error } = await supabase.from('stores').select('*').eq('active', true);
  if (error) {
    console.error("Error fetching stores:", error);
    process.exit(1);
  }
  console.log(`Found ${stores.length} active stores:`);
  stores.forEach(s => console.log(`- ${s.id}: ${s.name}`));
}

checkStores();
