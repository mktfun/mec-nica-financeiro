import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProcs() {
  // Let's try fetching OpenAPI spec / swagger from postgrest to see all exposed RPC functions
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const swagger = await res.json();
    console.log('PostgREST endpoints / paths:');
    const paths = Object.keys(swagger.paths || {});
    console.log(paths.filter(p => p.includes('rpc')));
    console.log('All paths:', paths);
  } catch (err) {
    console.error('Error fetching swagger:', err);
  }
}

checkProcs();
